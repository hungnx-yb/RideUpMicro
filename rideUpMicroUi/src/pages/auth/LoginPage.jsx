import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import useAuth from "../../hooks/useAuth";
import { isValidEmail } from "../../utils/validators";

function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || "/dashboard";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!isValidEmail(form.email)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!form.password) {
      nextErrors.password = "Password is required.";
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      await login(form);
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setErrors({ form: error.message || "Unable to login. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4 py-10">
      <section className="card w-full">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Login</h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Email"
            name="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="you@example.com"
          />

          <Input
            label="Password"
            name="password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            type="password"
            placeholder="********"
          />

          {errors.form ? <p className="text-sm text-red-600">{errors.form}</p> : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loading text="Signing in..." /> : "Sign In"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          New here?{" "}
          <Link to="/auth/register" className="font-medium text-brand-600">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
