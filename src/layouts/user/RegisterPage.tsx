import React, { useState } from "react";
import {
  registerUser,
  validateRegisterForm,
  RegisterRequest,
} from "../../api/user/registerApi";
import "./RegisterPage.css";

const RegisterPage: React.FC = () => {
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "",
    gender: "",
  });
  const [message, setMessage] = useState<string>(
    "Chào mừng bạn đến với kênh đăng ký!"
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("Đang xử lý đăng ký...");
    setErrors([]);

    // Kiểm tra mật khẩu khớp nhau
    if (form.password !== form.confirmPassword) {
      setErrors(["Mật khẩu và nhập lại mật khẩu không khớp"]);
      setMessage("Vui lòng kiểm tra lại thông tin!");
      setIsLoading(false);
      return;
    }

    // Validate form (loại bỏ confirmPassword trước khi validate)
    const { confirmPassword, ...formData } = form;

    // Debug: Kiểm tra dữ liệu trước khi gửi
    console.log("Original form:", form);
    console.log("Data to send:", formData);

    const validationErrors = validateRegisterForm(formData as RegisterRequest);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setMessage("Vui lòng kiểm tra lại thông tin!");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Form data to send:", formData); // Debug log
      const result = await registerUser(formData as RegisterRequest);
      if (result.success) {
        setMessage(
          "🎉 Đăng ký thành công! Hãy mở mail và xác thực để hoàn tất đăng ký."
        );
        setErrors([]); // Clear any previous errors
      } else {
        setMessage(`❌ ${result.message}`);
        setErrors([result.message]);
      }
    } catch (error) {
      console.error("Registration error:", error);
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra, vui lòng thử lại!";
      setMessage(`❌ ${errorMsg}`);
      setErrors([errorMsg]);
    }

    setIsLoading(false);
  };

  return (
    <div className="chat-register-container">
      <div className="chat-box">
        <div className="register-logo">
          <img 
            src="http://res.cloudinary.com/dytdhvf3s/image/upload/v1760508458/User_5e3ca275-4ec3-45c3-8f53-f173871d002e.jpg" 
            alt="ChatWeb Logo" 
          />
        </div>
        <div className="chat-message">{message}</div>
        {errors.length > 0 && (
          <div className="error-messages">
            {errors.map((error, index) => (
              <div key={index} className="error-message">
                ❌ {error}
              </div>
            ))}
          </div>
        )}
        <form className="chat-form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            placeholder="Tên đăng nhập"
            value={form.username}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="firstName"
            placeholder="Họ"
            value={form.firstName}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="lastName"
            placeholder="Tên"
            value={form.lastName}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Mật khẩu"
            value={form.password}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Nhập lại mật khẩu"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />
          <input
            type="tel"
            name="phoneNumber"
            placeholder="Số điện thoại"
            value={form.phoneNumber}
            onChange={handleChange}
            required
          />
          <div className="gender-options">
            <label>
              <input
                type="radio"
                name="gender"
                value="true"
                checked={form.gender === "true"}
                onChange={handleChange}
                required
              />
              Nam
            </label>
            <label>
              <input
                type="radio"
                name="gender"
                value="false"
                checked={form.gender === "false"}
                onChange={handleChange}
              />
              Nữ
            </label>
          </div>

          <input
            type="date"
            name="dateOfBirth"
            placeholder="Ngày sinh"
            value={form.dateOfBirth}
            onChange={handleChange}
            required
          />
          <button type="submit" className="send-btn" disabled={isLoading}>
            {isLoading ? "⏳ Đang đăng ký..." : "📝 Đăng ký"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
