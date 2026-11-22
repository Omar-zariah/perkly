import {notFound,redirect} from 'next/navigation';
import {getUser,supabaseServer,supabaseAdmin} from '@/lib/supabase';
import MerchantActions from '@/components/MerchantActions';
import BranchQRSection from '@/components/BranchQRSection';
import Link from 'next/link';

export default async function Merchant({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const user=await getUser();
  if(!user)redirect('/login');
  const db=await supabaseServer();
  const {data:role}=await db.from('business_staff').select('role').eq('business_id',id).eq('user_id',user.id).maybeSingle();
  if(!role)notFound();
  const {data:b}=await db.from('businesses').select('*').eq('id',id).single();
  if(!b)notFound();

  const admin=supabaseAdmin();
  const {count:members}=await admin.from('memberships').select('id',{count:'exact',head:true}).eq('business_id',id);
  const {data:events}=await admin.from('loyalty_events').select('kind,created_at').eq('business_id',id).order('created_at',{ascending:false}).limit(1000);
  const {data:branches}=await admin.from('branches').select('id,name,slug,city,address').eq('business_id',id).order('created_at');
  const {data:customers}=await admin.from('memberships').select('id,first_name,phone,stamps,rewards_available,total_stamps_earned,last_visit_at,created_at').eq('business_id',id).order('created_at',{ascending:false}).limit(50);

  const stamps=(events||[]).filter(e=>e.kind==='stamp').length;
  const rewards=(events||[]).filter(e=>e.kind==='redeem').length;
  const appUrl=process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000';
  const isOwner=role.role==='owner'||role.role==='admin'||role.role==='manager';

  return (
    <div className="wrap">
      <div className="pagehead">
        <div>
          <div className="eyebrow">Tableau de bord commerçant</div>
          <h1>{b.name}</h1>
          <p className="muted">{b.stamps_required} tampons → {b.reward_name} · <span className="pill">{b.plan}</span> · {b.currency||'MAD'} {b.monthly_price_mad||299}/mois</p>
        </div>
        <Link className="btn secondary" href="/dashboard">Mes établissements</Link>
      </div>

      {/* Stats */}
      <div className="stats">
        <div className="panel stat"><span>Membres inscrits</span><b>{members||0}</b><span>Clients enregistrés</span></div>
        <div className="panel stat"><span>Tampons récents</span><b>{stamps}</b><span>1 000 derniers événements</span></div>
        <div className="panel stat"><span>Récompenses échangées</span><b>{rewards}</b><span>1 000 derniers événements</span></div>
      </div>

      {/* QR codes & Counter Display section */}
      <div className="panel" style={{marginBottom:20}}>
        <h3 style={{marginBottom:8}}>📍 Générateur de QR Code & Chevalet de Comptoir</h3>
        <p className="small muted" style={{marginBottom:18}}>
          Vos clients scannent ce QR code ou approchent leur téléphone (NFC) pour créer leur carte et l'ajouter instantanément à leur portefeuille mobile.
        </p>
        <BranchQRSection
          business={b}
          branches={(branches||[]).map(br=>({...br,businessSlug:b.slug,appUrl}))}
          appUrl={appUrl}
        />
      </div>

      {/* Customer list */}
      {(customers||[]).length>0 && (
        <div className="panel" style={{marginBottom:20}}>
          <h3 style={{marginBottom:16}}>👥 Clients ({members||0})</h3>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr style={{borderBottom:'1px solid var(--line)',textAlign:'left'}}>
                  <th style={{padding:'8px 10px',fontWeight:700}}>Prénom</th>
                  <th style={{padding:'8px 10px',fontWeight:700}}>Téléphone</th>
                  <th style={{padding:'8px 10px',fontWeight:700}}>Tampons</th>
                  <th style={{padding:'8px 10px',fontWeight:700}}>Récompenses</th>
                  <th style={{padding:'8px 10px',fontWeight:700}}>Dernière visite</th>
                  <th style={{padding:'8px 10px',fontWeight:700}}>Inscrit le</th>
                  <th style={{padding:'8px 10px',fontWeight:700}}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {(customers||[]).map(c=>(
                  <tr key={c.id} style={{borderBottom:'1px solid var(--line)'}}>
                    <td style={{padding:'8px 10px',fontWeight:600}}>{c.first_name||'—'}</td>
                    <td style={{padding:'8px 10px',color:'var(--sub)',fontFamily:'monospace',fontSize:12}}>{c.phone?c.phone.slice(0,8)+'••••':'—'}</td>
                    <td style={{padding:'8px 10px'}}>{c.stamps||0}/{b.stamps_required}</td>
                    <td style={{padding:'8px 10px'}}>{c.rewards_available||0>0?<span style={{background:'#fef3c7',color:'#92400e',padding:'2px 7px',borderRadius:12,fontWeight:700}}>{c.rewards_available} 🎁</span>:<span style={{color:'var(--sub)'}}>0</span>}</td>
                    <td style={{padding:'8px 10px',color:'var(--sub)',fontSize:12}}>{c.last_visit_at?new Date(c.last_visit_at).toLocaleDateString('fr-MA'):'—'}</td>
                    <td style={{padding:'8px 10px',color:'var(--sub)',fontSize:12}}>{new Date(c.created_at).toLocaleDateString('fr-MA')}</td>
                    <td style={{padding:'8px 10px'}}>{(c.total_stamps_earned||0)>0?<span className="pill" style={{background:'#dcfce7',color:'#166534'}}>Acheteur</span>:<span className="pill" style={{background:'#f1f5f9',color:'#64748b'}}>Inscrit</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legacy banner */}
      <div className="banner">
        <b>Inviter des clients</b>
        <p className="small">Partagez l'URL d'inscription de votre établissement ou imprimez le QR ci-dessus.</p>
        <Link href="/wallet" className="btn tiny secondary">Voir le wallet client</Link>
      </div>

      <MerchantActions businessId={id} isOwner={isOwner} plan={b.plan} hasCustomer={(members||0)>0}/>
    </div>
  );
}
