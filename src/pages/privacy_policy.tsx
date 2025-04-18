import React from "react";
import styles from "@/styles/Home.module.css";
export const Color = {
    primary: "#1B2536",     // Dark Blue
    secondary: "#D9252A",   // Red
    background: "#F3F2EC",  // Light Beige
    text: "#FFFFFF",        // White
    gray: "#A5A5A5",        // Optional UI elements
};

const sectionStyle = {
    borderLeft: `4px solid ${Color.secondary}`,
    paddingLeft: "1rem",
    marginTop: "2rem",
};

const PrivacyPolicy = () => {
    return (

        <div className={`${styles.page}`}>
            <main className={styles.main}>
                <header style={{ marginBottom: "2.5rem", textAlign: "center" }}>
                    <h1
                        style={{
                            fontSize: "2.5rem",
                            color: Color.secondary,
                            marginBottom: "0.5rem",
                        }}
                    >
                        Privacy Policy
                    </h1>
                    <p style={{ fontSize: "1rem", color: Color.gray }}>
                        Effective Date: April 18, 2025
                    </p>
                </header>

                <p>
                    Thank you for using the Sikkim<strong>Lottery application</strong>. Your privacy is important to us. This policy explains what data we collect (none!), how we use it (we don’t), and your rights (you’re in the clear).
                </p>

                <section style={sectionStyle}>
                    <h2 style={{ fontSize: "1.5rem", color: Color.secondary }}>
                        1. No Collection of Personal Information
                    </h2>
                    <ul style={{ paddingLeft: "1.2rem" }}>
                        <li>We do <strong>not collect</strong>, store, or share any personal data.</li>
                        <li>No login or sign-up is required to use the app.</li>
                        <li>No access is requested to your name, email, phone number, or any other identity-related information.</li>
                    </ul>
                </section>

                <section style={sectionStyle}>
                    <h2 style={{ fontSize: "1.5rem", color: Color.secondary }}>
                        2. Internet Access
                    </h2>
                    <p>
                        The app uses an internet connection to retrieve live content. This is strictly for app functionality — <strong>no personal data is sent or stored</strong>.
                    </p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={{ fontSize: "1.5rem", color: Color.secondary }}>
                        3. No Third-Party Services
                    </h2>
                    <p>
                        We do not use third-party services like Google Analytics, advertising SDKs, or any external libraries that collect your information.
                    </p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={{ fontSize: "1.5rem", color: Color.secondary }}>
                        4. Children’s Privacy
                    </h2>
                    <p>
                        Our app is safe for all ages. Since no data is collected, we comply with COPPA and other privacy protections for children.
                    </p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={{ fontSize: "1.5rem", color: Color.secondary }}>
                        5. Changes to This Policy
                    </h2>
                    <p>
                        If we ever change how we handle data (unlikely!), we’ll update this page and reflect the new date here.
                    </p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={{ fontSize: "1.5rem", color: Color.secondary }}>
                        6. Contact Us
                    </h2>
                    <p>
                        Questions? Contact us at:<br />
                        <strong>Email:</strong> sikkim126@gmail.com
                    </p>
                </section>

                <footer style={{ marginTop: "3rem", textAlign: "center", color: Color.gray }}>
                    &copy; {new Date().getFullYear()} Lottery App. All rights reserved.
                </footer>
            </main>
        </div>
    );
};

export default PrivacyPolicy;
