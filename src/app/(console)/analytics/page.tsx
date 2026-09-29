import { LiveAnalyticsReport } from "@/components/live-analytics-report";
import { PageHeading } from "@/components/page-heading";
import { getDashboardData, getOperationsAnalytics } from "@/lib/data";

export default async function AnalyticsPage() {
  const [{ active }, analytics] = await Promise.all([getDashboardData(), getOperationsAnalytics()]);
  return <>
    <PageHeading eyebrow="Product intelligence" title="Audience and marketplace analytics" description="Thirty live operational models across acquisition, product use, supply, demand, payments, AI, email, and content. Empty modules stay empty until production telemetry arrives."/>
    <LiveAnalyticsReport modules={analytics.modules} heatmap={analytics.heatmap} active={active} events={analytics.events}/>
  </>;
}
