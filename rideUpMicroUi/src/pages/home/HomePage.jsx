import { Link } from "react-router-dom";
import { FaRoute, FaShieldAlt, FaRocket } from "react-icons/fa";
import Button from "../../components/common/Button";

function FeatureCard({ icon, title, description }) {
  return (
    <article className="card">
      <div className="mb-3 text-2xl text-brand-500">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="text-slate-600">{description}</p>
    </article>
  );
}

function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <section className="mb-10 rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 p-8 text-white">
        <h1 className="mb-3 text-4xl font-bold">Build fast, scalable React applications</h1>
        <p className="mb-6 max-w-2xl text-brand-50">
          This starter architecture keeps routing, API communication, context, and reusable UI
          components cleanly separated for long-term growth.
        </p>
        <Link to="/auth/login">
          <Button variant="secondary">Get Started</Button>
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <FeatureCard
          icon={<FaRoute />}
          title="Clear Routing"
          description="All route definitions and protection rules are managed inside the routes module."
        />
        <FeatureCard
          icon={<FaShieldAlt />}
          title="Protected Areas"
          description="Sensitive pages use reusable route guards that integrate with auth context."
        />
        <FeatureCard
          icon={<FaRocket />}
          title="API Ready"
          description="Axios services centralize backend communication with one configurable client."
        />
      </section>
    </main>
  );
}

export default HomePage;
