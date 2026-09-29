import { Check, FileUp, UserRoundPlus } from "lucide-react";
import { onboardPriest } from "@/app/actions/content";
import { PageHeading } from "@/components/page-heading";
import { getPeopleData, getPoojas } from "@/lib/data";
import { PriestPhotoUpload } from "./priest-photo-upload";
import { PriestGalleryUpload } from "./priest-gallery-upload";
import { PriestCredentialsFields } from "./priest-credentials-fields";
import { LocationTagPicker } from "./location-tag-picker";
import { PriestImportReview } from "./priest-import-review";
import { PriestListingTable } from "./priest-listing-table";

export const maxDuration = 300;

const languages = ["Kannada", "Sanskrit", "English", "Hindi", "Tamil", "Telugu", "Marathi"];

export default async function PriestsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const [{ priests }, poojas, query] = await Promise.all([getPeopleData(), getPoojas(), searchParams]);
  return <>
    <PageHeading eyebrow="Provider operations" title="Priest quality and coverage" description="Verify applications, maintain public marketplace profiles, and control the areas where each priest can be discovered."/>
    {query.error && <div className="notice error">{decodeURIComponent(query.error)}</div>}
    {query.success && <div className="notice success">{decodeURIComponent(query.success)}</div>}
    <section className="panel bulk-onboard-panel">
      <div className="bulk-onboard-copy"><span className="feature-icon"><FileUp size={19}/></span><div><p className="eyebrow">High-volume onboarding</p><h2>Import up to 250 Purohits</h2><p>Upload a CSV or Excel roster to create managed marketplace profiles. Review every row and upload or replace each profile photo before import. Existing priest emails are updated instead of duplicated.</p></div></div>
      <PriestImportReview/>
      <div className="bulk-onboard-facts"><span><strong>No email sent</strong>Managed profiles are created silently.</span><span><strong>Duplicate-aware</strong>Existing priest records are updated.</span><span><strong>Row-level results</strong>Valid rows continue if another row fails.</span></div>
    </section>
    <details className="create-drawer onboard-drawer">
      <summary><UserRoundPlus size={18}/><span><strong>Add one Purohit manually</strong><small>Create the profile, login credentials, locations, and photo gallery in one flow.</small></span></summary>
      <form action={onboardPriest} className="editor-form onboard-form">
        <div className="form-section"><span>01</span><div><strong>Identity and access</strong><small>Create Supabase Auth credentials that the priest can use immediately.</small></div></div>
        <div className="form-grid">
          <label>Full name<input name="full_name" required minLength={2} placeholder="Sri Ramachandra Bhat"/></label>
          <label>Phone number<input name="phone" inputMode="tel" required placeholder="+91 98765 43210"/></label>
          <label>Years of experience<input name="years_experience" type="number" min="0" max="80" defaultValue="1" required/></label>
          <label className="span-2">Profile headline<input name="profile_headline" required placeholder="Smartha Vedic Purohit for home ceremonies"/></label>
          <label className="span-2">About the Purohit<textarea name="bio" rows={4} required placeholder="Training, tradition, ceremony experience, and the families served."/></label>
          <PriestCredentialsFields/>
        </div>
        <div className="form-section"><span>02</span><div><strong>Coverage and services</strong><small>These fields control matching, marketplace filters, and location pages.</small></div></div>
        <div className="form-grid">
          <LocationTagPicker/>
          <fieldset className="span-2 choice-field"><legend>Languages</legend><div className="choice-grid">{languages.map((language) => <label key={language}><input type="checkbox" name="languages" value={language}/><span>{language}</span></label>)}</div></fieldset>
          <fieldset className="span-2 choice-field"><legend>Puja specialties</legend><div className="choice-grid">{poojas.filter((pooja) => pooja.is_active).map((pooja) => <label key={pooja.id}><input type="checkbox" name="pooja_slugs" value={pooja.slug}/><span>{pooja.name}</span></label>)}</div></fieldset>
          <label>Starting price (INR)<input name="starting_price_inr" type="number" min="0" defaultValue="1000" required/></label>
          <label>Maximum price (INR)<input name="max_price_inr" type="number" min="0" defaultValue="5000" required/></label>
        </div>
        <div className="form-section"><span>03</span><div><strong>Marketplace presentation</strong><small>Upload the profile photo and a ceremony gallery shown in the customer app.</small></div></div>
        <div className="form-grid">
          <PriestPhotoUpload/>
          <PriestGalleryUpload/>
          <label>Initial status<select name="verification_status" defaultValue="pending"><option value="pending">Pending review</option><option value="verified">Verified (public with photo)</option></select></label>
        </div>
        <div className="onboard-summary"><Check size={17}/><span><strong>One-step managed onboarding</strong><small>Creates Supabase login credentials, writes the public profile, stores the gallery, adds service prices, and records the admin action.</small></span></div>
        <div className="form-actions"><button className="primary-button"><UserRoundPlus size={16}/>Create Purohit account</button></div>
      </form>
    </details>
    <PriestListingTable priests={priests}/>
  </>;
}
