
const sendEmail = async (option) => {
    try {
        const BREVO_API_KEY = process.env.BREVO_API_KEY?.trim();

        if (!BREVO_API_KEY) {
            throw new Error("Missing Brevo API Key in .env file");
        }

        const data = {
            sender: {
                name: process.env.BREVO_SENDER_NAME,
                email: process.env.BREVO_SENDER_EMAIL,
            },

            to: [
                {
                    email: option.email,
                    name: option.name || "",
                },
            ],

            subject: option.subject,
            htmlContent: option.html,
            ...(option.text && { textContent: option.text }),
        };

        const response = await fetch(
            "https://api.brevo.com/v3/smtp/email",
            {
                method: "POST",
                headers: {
                    "accept": "application/json",
                    "api-key": BREVO_API_KEY,
                    "content-type": "application/json",
                },
                body: JSON.stringify(data),
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Failed to send email"
            );
        }

        console.log("Email sent successfully:", result.messageId);

        return {
            success: true,
            messageId: result.messageId,
        };

    } catch (error) {
        console.error("Brevo Email Error:", error.message);
        throw error;
    }
};

export default sendEmail;
