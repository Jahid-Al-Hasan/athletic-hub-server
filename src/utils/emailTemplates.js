const createEventEmailTemplate = (event) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Event Created</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, oklch(0.55 0.2 265), oklch(0.78 0.18 310));
            padding: 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .event-card {
            background: #f8fafc;
            border-radius: 8px;
            padding: 25px;
            margin: 20px 0;
            border-left: 4px solid oklch(0.55 0.2 265);
        }
        .event-title {
            font-size: 22px;
            font-weight: 700;
            color: oklch(0.28 0.04 250);
            margin: 0 0 10px 0;
        }
        .event-details {
            display: grid;
            gap: 12px;
            margin: 20px 0;
        }
        .detail-item {
            display: flex;
            align-items: center;
            gap: 12px;
            color: oklch(0.55 0.015 250);
        }
        .detail-item strong {
            color: oklch(0.28 0.04 250);
            min-width: 80px;
        }
        .description {
            background: white;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            border: 1px solid oklch(0.87 0.01 250);
        }
        .cta-button {
            display: inline-block;
            background: oklch(0.55 0.2 265);
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            transition: background 0.3s ease;
        }
        .organizer {
            background: white;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            display: flex;
            align-items: center;
            gap: 12px;
            border: 1px solid oklch(0.87 0.01 250);
        }
        .organizer-avatar {
            width: 40px;
            height: 40px;
            background: oklch(0.55 0.2 265);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
        .footer {
            background: oklch(0.95 0.005 180);
            padding: 25px;
            text-align: center;
            color: oklch(0.55 0.015 250);
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 New Event Created!</h1>
            <p>Get ready to play and connect with fellow athletes</p>
        </div>
        
        <div class="content">
            <p style="font-size: 16px; color: oklch(0.55 0.015 250); margin-bottom: 25px;">
                Hello Sports Enthusiast! A new event has been created that matches your interests.
            </p>

            <div class="event-card">
                <h2 class="event-title">${event.name}</h2>
                
                <div class="event-details">
                    <div class="detail-item">
                        <strong>📅 Date:</strong>
                        <span>${new Date(event.date).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}</span>
                    </div>
                    <div class="detail-item">
                        <strong>📍 Location:</strong>
                        <span>${event.location}</span>
                    </div>
                    <div class="detail-item">
                        <strong>🏆 Category:</strong>
                        <span>${event.category}</span>
                    </div>
                    <div class="detail-item">
                        <strong>💰 Registration fee:</strong>
                        <span>${
                          event.registrationFee
                            ? `$${event.registrationFee}`
                            : "Free"
                        }</span>
                    </div>
                </div>

                ${
                  event.description
                    ? `
                <div class="description">
                    <strong>About this event:</strong>
                    <p style="margin: 8px 0 0 0; line-height: 1.5;">${event.description}</p>
                </div>
                `
                    : ""
                }
            </div>

            <div>
                <strong>Organized by ${event.organizer}</strong>
            </div>

            <div style="border-top: 1px solid oklch(0.87 0.01 250); margin-top: 30px; padding-top: 20px;">
                <p style="font-size: 14px; color: oklch(0.55 0.015 250); text-align: center;">
                    You're receiving this email because you subscribed to AthleticHub.
                </p>
            </div>
        </div>
        
        <div class="footer">
            <p>© 2025 AthleticHub. Bringing athletes together.</p>
            <p>Stay active, stay connected! 🏀⚽🎾</p>
        </div>
    </div>
</body>
</html>
  `;
};

module.exports = {
  createEventEmailTemplate,
};
