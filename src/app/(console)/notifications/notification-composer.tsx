"use client";

import { useState } from "react";
import Image from "next/image";
import { BatteryFull, BellRing, Check, ChevronRight, CreditCard, Handshake, MessageSquareQuote, Monitor, Radio, Send, Signal, Smartphone, Wifi } from "lucide-react";
import { sendNotificationCampaign } from "@/app/actions/notifications";
import styles from "./notification-composer.module.css";

const templates = [
  { label: "Festival", title: "Book your festival puja", body: "Trusted purohits are available near you. Reserve your preferred time today." },
  { label: "New service", title: "A new puja is now available", body: "Explore the latest ceremony in the Purohith Connect catalog." },
  { label: "Complete booking", title: "Your purohit is waiting", body: "Return to your booking and complete the next step." },
];

const automations = [
  { icon: CreditCard, title: "Payment confirmed", detail: "Customer and priest receive the confirmed amount and booking link.", event: "payment_confirmed" },
  { icon: Handshake, title: "Purohit accepted", detail: "Customer is prompted to complete payment as soon as a priest accepts.", event: "booking_accepted" },
  { icon: MessageSquareQuote, title: "New proposal received", detail: "Customer sees the quote, priest name, and request destination.", event: "proposal_received" },
];

export function NotificationComposer() {
  const [title, setTitle] = useState("Book your festival puja");
  const [body, setBody] = useState("Trusted purohits are available near you. Reserve your preferred time today.");
  const [channel, setChannel] = useState<"all" | "mobile" | "web">("all");

  return <>
    <div className={styles.layout}>
      <section className={`panel ${styles.composer}`}>
        <div className="panel-heading"><div><p className="eyebrow">Campaign studio</p><h2>Create a marketing notification</h2><span>One message, delivered to the app inbox and registered devices.</span></div><span className={styles.liveBadge}><i/>Live preview</span></div>
        <div className={styles.templates}>{templates.map((template) => <button type="button" key={template.label} onClick={() => { setTitle(template.title); setBody(template.body); }}>{template.label}</button>)}</div>
        <div className={styles.channelPicker} role="group" aria-label="Campaign delivery channel"><span>Send to</span>{([ ["all", "Mobile + web"], ["mobile", "Mobile app"], ["web", "Web browser"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={channel === value} onClick={() => setChannel(value)}>{value === "web" ? <Monitor size={14}/> : <Smartphone size={14}/>} {label}</button>)}</div>
        <form action={sendNotificationCampaign} className={styles.form}>
          <input type="hidden" name="channel" value={channel}/>
          <label>Notification title <span>{title.length}/80</span><input name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} required/></label>
          <label>Message <span>{body.length}/220</span><textarea name="body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={220} rows={4} required/></label>
          <div className={styles.fields}>
            <label>Audience<select name="audience" defaultValue="all"><option value="all">All customers and priests</option><option value="customers">Customers only</option><option value="priests">Priests only</option></select></label>
            <label>Open screen<select name="deep_link" defaultValue="notifications"><option value="notifications">Notification inbox</option><option value="home">Home</option><option value="bookings">Bookings</option><option value="priests">Find priests</option><option value="profile">Profile</option></select></label>
          </div>
          <div className={styles.delivery}>{channel !== "web" && <><span><Smartphone size={15}/>Android · FCM</span><span><Smartphone size={15}/>iOS · APNs</span></>}{channel !== "mobile" && <span><Monitor size={15}/>Web · Browser push</span>}<span><BellRing size={15}/>In-app · Realtime</span></div>
          <button className={`primary-button ${styles.sendButton}`} type="submit"><Send size={15}/>Send campaign now<ChevronRight size={15}/></button>
        </form>
      </section>
      <aside className={styles.previewPanel}>
        <div className={styles.previewHeading}><div><p className="eyebrow">Live {channel === "web" ? "browser" : "device"} preview</p><strong>{channel === "web" ? "Web notification" : "Notification preview"}</strong></div><span><Radio size={12}/>In-app + push</span></div>
        {channel === "web" ? <div className={styles.browserStage}><div className={styles.browserWindow}><div className={styles.browserBar}><i/><i/><i/><span>bookingg.purohithconnect.com</span></div><div className={styles.browserCanvas}><div className={styles.browserBrand}>PUROHITH CONNECT</div><div className={styles.browserHero}>Find the right Purohit<br/>for every occasion.</div><div className={styles.browserCard}><div className={styles.appIcon}><BellRing size={17}/></div><div><small>bookingg.purohithconnect.com · now</small><strong>{title || "Notification title"}</strong><p>{body || "Your message will appear here."}</p></div></div></div></div><p className={styles.browserNote}>Browser notifications also appear when this page is closed, after the user enables them.</p></div> : <div className={styles.deviceStage}>
          <div className={styles.deviceRender} aria-label="Live notification preview on a smartphone">
            <Image src="/notification-phone.png" width={1024} height={1536} alt="Realistic graphite smartphone" className={styles.deviceImage} priority />
            <div className={styles.screenContent}>
              <div className={styles.wallpaperGlow}/>
              <div className={styles.status}><span>9:41</span><span className={styles.signals}><Signal size={11} fill="currentColor"/><Wifi size={12}/><BatteryFull size={15}/></span></div>
              <div className={styles.lock}><span>Friday, 10 October</span><strong>9:41</strong></div>
              <div className={styles.notification}><div className={styles.appIcon}><BellRing size={17}/></div><div><div className={styles.appName}>PUROHITH CONNECT <span>now</span></div><strong>{title || "Notification title"}</strong><p>{body || "Your message will appear here."}</p></div></div>
              <div className={styles.homeBar}/>
            </div>
          </div>
        </div>}
        <small>Preview updates as you type. The operating system can make minor spacing changes.</small>
      </aside>
    </div>
    <section className={styles.automationPanel}>
      <div className={styles.automationHeading}><div><p className="eyebrow">Transactional automations</p><h2>Booking notifications run automatically</h2><span>Each event creates an in-app inbox item and sends a device push when a token is registered.</span></div><div className={styles.operational}><i/><span>3 workflows active</span></div></div>
      <div className={styles.automationGrid}>{automations.map(({ icon: Icon, title: automationTitle, detail, event }) => <article key={event}><span className={styles.automationIcon}><Icon size={19}/></span><div><strong>{automationTitle}</strong><p>{detail}</p><code>{event}</code></div><span className={styles.activeCheck}><Check size={13}/>Active</span></article>)}</div>
    </section>
  </>;
}
