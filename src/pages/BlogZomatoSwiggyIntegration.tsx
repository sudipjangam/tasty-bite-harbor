import { useEffect } from "react";
import { Link } from "react-router-dom";

const CANONICAL = "https://tasty-bite-harbor.lovable.app/blog/zomato-swiggy-integration";

const setMeta = (selector: string, attr: string, value: string) => {
  let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!el) {
    if (selector.startsWith("link")) {
      el = document.createElement("link");
      (el as HTMLLinkElement).rel = selector.match(/rel="([^"]+)"/)?.[1] || "";
    } else {
      el = document.createElement("meta");
      const name = selector.match(/name="([^"]+)"/)?.[1];
      const prop = selector.match(/property="([^"]+)"/)?.[1];
      if (name) (el as HTMLMetaElement).name = name;
      if (prop) el.setAttribute("property", prop);
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
};

const BlogZomatoSwiggyIntegration = () => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "How to Integrate Zomato & Swiggy with Your Restaurant POS";
    setMeta('meta[name="description"]', "content", "Step-by-step guide to tie up with Swiggy and Zomato and connect them to your restaurant billing software for real-time menu sync, unified orders, and higher sales.");
    setMeta('link[rel="canonical"]', "href", CANONICAL);
    setMeta('meta[property="og:title"]', "content", "Integrate Zomato & Swiggy with Your Restaurant POS");
    setMeta('meta[property="og:description"]', "content", "How to tie up with Swiggy and Zomato and unify orders inside your restaurant billing software.");
    setMeta('meta[property="og:url"]', "content", CANONICAL);
    setMeta('meta[property="og:type"]', "content", "article");

    let ld = document.getElementById("ld-zomato-swiggy") as HTMLScriptElement | null;
    if (!ld) {
      ld = document.createElement("script");
      ld.type = "application/ld+json";
      ld.id = "ld-zomato-swiggy";
      document.head.appendChild(ld);
    }
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "How to Integrate Zomato and Swiggy with your Restaurant POS to Increase Sales",
      description: "Guide for Indian restaurants on connecting Zomato and Swiggy to a restaurant POS / billing software.",
      mainEntityOfPage: CANONICAL,
      author: { "@type": "Organization", name: "Swadeshi Solutions" },
      publisher: { "@type": "Organization", name: "Swadeshi Solutions" },
    });

    return () => {
      document.title = prevTitle;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <article className="max-w-3xl mx-auto px-6 py-12 prose prose-slate dark:prose-invert">
        <nav className="text-sm mb-6">
          <Link to="/" className="text-primary hover:underline">← Back to home</Link>
        </nav>

        <h1 className="text-4xl font-bold mb-4">
          How to Integrate Zomato and Swiggy with Your Restaurant POS to Increase Sales
        </h1>
        <p className="text-muted-foreground mb-8">
          A practical guide for Indian restaurant owners on how to tie up with Swiggy and Zomato,
          connect them to your restaurant billing software, and run online orders without chaos.
        </p>

        <h2>Why integrate delivery platforms with your POS?</h2>
        <p>
          Running Zomato and Swiggy on separate tablets is the #1 reason restaurants lose money on online orders:
          missed tickets, wrong items, stale menus, and end-of-day reports that never match. Integrating both
          platforms directly with your restaurant POS solves this by creating a single source of truth for menu,
          inventory, orders, and revenue.
        </p>
        <ul>
          <li>Real-time menu and price sync across Zomato, Swiggy, and dine-in.</li>
          <li>Unified order queue — every channel lands in one Kitchen Display System (KDS).</li>
          <li>Automatic stock decrement so 86’d items disappear from delivery apps instantly.</li>
          <li>Consolidated sales, tax (GST), and commission reports in one dashboard.</li>
        </ul>

        <h2>How to tie up with Swiggy (and Zomato) — step by step</h2>
        <ol>
          <li>
            <strong>Register your restaurant.</strong> Apply on the Swiggy Partner portal
            (partner.swiggy.com) and Zomato for Business (zomato.com/business). Keep FSSAI license,
            GSTIN, PAN, bank details, and menu photos ready.
          </li>
          <li>
            <strong>Complete KYC &amp; sign the contract.</strong> Both platforms will verify documents
            and share a commission structure (typically 18–25%).
          </li>
          <li>
            <strong>Go live with a clean menu.</strong> Upload categories, modifiers, and HD images.
            A well-structured menu lifts conversion by 20–30%.
          </li>
          <li>
            <strong>Request POS integration.</strong> Ask your Swiggy/Zomato account manager to enable
            POS integration for your outlet and share the API/middleware credentials.
          </li>
          <li>
            <strong>Connect inside your restaurant billing software.</strong> In Swadeshi Solutions,
            open <em>Orders → Integrations</em>, paste the outlet ID and tokens, map menu items,
            and switch the channel on.
          </li>
        </ol>

        <h2>What changes the day you go integrated</h2>
        <h3>1. Orders flow straight to the kitchen</h3>
        <p>
          Every Zomato/Swiggy order auto-prints a KOT and appears on your{" "}
          <Link to="/kitchen">Kitchen Display</Link> next to dine-in and QSR tickets. Staff stop
          juggling tablets.
        </p>

        <h3>2. Menu &amp; 86-list stay in sync</h3>
        <p>
          Mark an item out-of-stock in <Link to="/menu">Menu Management</Link> and it’s hidden on
          both apps within seconds — no more refunds for unavailable dishes.
        </p>

        <h3>3. Unified analytics</h3>
        <p>
          Your <Link to="/dashboard">dashboard</Link> shows channel-wise revenue, AOV, peak hours,
          and top items across Zomato, Swiggy, dine-in, and QSR POS — so you know exactly where to
          push offers.
        </p>

        <h3>4. Inventory &amp; recipe costing</h3>
        <p>
          Each online order decrements raw materials via{" "}
          <Link to="/recipes">recipe management</Link>, giving you true food cost and margin after
          aggregator commission.
        </p>

        <h2>Choosing the right restaurant billing software</h2>
        <p>Look for these capabilities before you commit:</p>
        <ul>
          <li>Native Zomato &amp; Swiggy integration (not just a CSV importer).</li>
          <li>GST-compliant invoicing and e-bill sharing.</li>
          <li>KOT routing to multiple kitchens / counters.</li>
          <li>Offline-first POS — orders should never drop when internet flickers.</li>
          <li>Role-based access for cashiers, captains, and managers.</li>
        </ul>
        <p>
          Swadeshi Solutions ships all of the above plus a dedicated{" "}
          <Link to="/qsr-pos">QSR POS</Link> for high-volume counters and{" "}
          <Link to="/orders">order management</Link> for table-service restaurants.
        </p>

        <h2>Common mistakes to avoid</h2>
        <ul>
          <li>Different prices on Zomato vs Swiggy vs dine-in — confuses customers and staff.</li>
          <li>Not factoring 20%+ aggregator commission into menu pricing.</li>
          <li>Skipping daily reconciliation between aggregator payouts and POS sales.</li>
          <li>Running promotions without checking food cost in your POS first.</li>
        </ul>

        <h2>FAQ</h2>
        <h3>How long does Swiggy/Zomato POS integration take?</h3>
        <p>
          Once both accounts are live and credentials are issued, mapping the menu inside the POS
          typically takes 1–2 hours.
        </p>

        <h3>Does integration work for cloud kitchens and QSRs?</h3>
        <p>
          Yes. Cloud kitchens benefit the most because 100% of orders come from aggregators —
          integration eliminates manual entry entirely.
        </p>

        <h3>Will I still get orders if my internet is down?</h3>
        <p>
          Swadeshi POS is offline-first: orders queue locally and sync to Zomato/Swiggy and your
          dashboard the moment connectivity returns.
        </p>

        <div className="mt-10 p-6 rounded-lg border bg-muted/40">
          <h2 className="mt-0">Ready to unify Zomato, Swiggy, and dine-in?</h2>
          <p>
            Start a free trial of Swadeshi Solutions — India’s restaurant billing software built for
            multi-channel sales.
          </p>
          <Link
            to="/auth"
            className="inline-block mt-2 px-5 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </article>
    </main>
  );
};

export default BlogZomatoSwiggyIntegration;
