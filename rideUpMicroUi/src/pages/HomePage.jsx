import { useEffect } from "react";
import Navbar from "../components/Navbar";
import HeroSection from "../components/HeroSection";
import StatsSection from "../components/StatsSection";
import HowItWorks from "../components/HowItWorks";
import BenefitsSection from "../components/BenefitsSection";
import CTASection from "../components/CTASection";
import Footer from "../components/Footer";

function HomePage() {
  useEffect(() => {
    const revealElements = document.querySelectorAll(".reveal-on-scroll");

    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            currentObserver.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#fff7ed,transparent_32%),linear-gradient(#ffffff,#ffffff)]">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <HowItWorks />
        <BenefitsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

export default HomePage;
