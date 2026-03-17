import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { isValidEmail } from "../../utils/validators";

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!form.name) {
      nextErrors.name = "Name is required.";
    }

    if (!isValidEmail(form.email)) {
      nextErrors.email = "Please provide a valid email.";
    }

    if (form.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      navigate("/auth/login");
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4 py-10">
      <section className="card w-full">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Register</h1>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
          />
          <Input
            label="Email"
            name="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
          />
          <Input
            label="Password"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
          />

          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/auth/login" className="font-medium text-brand-600">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}

export default RegisterPage;
