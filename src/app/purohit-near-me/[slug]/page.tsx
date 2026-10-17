import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BANGALORE_AREAS } from "@/data/bangalore-areas";
import { getPeopleData } from "@/lib/data";
import styles from "./page.module.css";

const services = [
  ["Griha Pravesh", "Housewarming rituals, homa, and ceremony planning."],
  ["Satyanarayana Puja", "Profile matching for language, tradition, date, and budget."],
  ["Rudra Abhishek", "Experienced purohits for abhisheka and related rituals."],
  ["Ganesh Puja", "Homes, offices, festivals, and auspicious beginnings."],
  ["Navagraha Shanti", "Shanti pooja and homa requirements."],
  ["Namakarana and Vivaha", "Family ceremonies and proposal requests."],
];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const area = BANGALORE_AREAS.find((item) => item.slug === slug);
  if (!area) return { title: "Location page" };
  return { title: `Purohit near me in ${area.name}, Bangalore` };
}

export default async function AreaLocationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const area = BANGALORE_AREAS.find((item) => item.slug === slug);
  if (!area) notFound();

  const { priests } = await getPeopleData();
  const listed = priests.filter((priest) =>
    priest.verification_status === "verified"
    && (priest.service_areas || []).some((item: string) => item.toLowerCase() === area.name.toLowerCase()),
  );
  const nearby = BANGALORE_AREAS.filter((item) => item.zone === area.zone && item.slug !== area.slug).slice(0, 8);

  return <main className={styles.page}>
    <header className={styles.top}>
      <div className={styles.wrap}>
        <Link href="/seo/locations">Purohith Connect</Link>
        <nav>
          <Link href="/seo/locations">Location pages</Link>
          <Link href="/priests">Priests</Link>
        </nav>
      </div>
    </header>
    <section className={styles.hero}>
      <div className={styles.wrap}>
        <p className={styles.crumb}><Link href="/seo/locations">Location pages</Link> / {area.zone} / {area.name}</p>
        <p className={styles.eyebrow}>{area.zone} Bangalore</p>
        <h1>Purohit near me in {area.name}</h1>
        <p>Compare verified priests who serve {area.name}. This preview stays on this site, at /purohit-near-me/{area.slug}.</p>
        <p className={styles.count}>{listed.length} verified {listed.length === 1 ? "provider" : "providers"} tagged for {area.name}</p>
      </div>
    </section>
    <section className={styles.band}>
      <div className={styles.wrap}>
        <h2>Available verified purohits</h2>
        {listed.length ? <ul className={styles.providers}>
          {listed.map((priest) => <li key={priest.id}>
            <strong>{priest.display_name}</strong>
            <span>{priest.profile_headline || priest.service_areas?.join(", ")}</span>
          </li>)}
        </ul> : <p>No verified priest is tagged for {area.name} yet. Add the area on a priest profile and it will show up here.</p>}
        <Link className={styles.button} href="/priests">Manage priests</Link>
      </div>
    </section>
    <section className={styles.band}>
      <div className={styles.wrap}>
        <h2>Ceremonies in {area.name}</h2>
        <div className={styles.cards}>
          {services.map(([name, copy]) => <article key={name}><strong>{name}</strong><p>{copy}</p></article>)}
        </div>
      </div>
    </section>
    <section className={styles.band}>
      <div className={styles.wrap}>
        <h2>Nearby {area.zone} areas</h2>
        <div className={styles.nearby}>
          {nearby.map((item) => <Link key={item.slug} href={`/purohit-near-me/${item.slug}`}>{item.name}</Link>)}
        </div>
      </div>
    </section>
  </main>;
}
