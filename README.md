# InternStack Backend

Cookie-authenticated Express API backed by MongoDB/Mongoose. Brevo SMTP is used through Nodemailer when SMTP credentials are configured; development and tests can use the console/in-memory mail adapters.

The in-memory rate limiter is process-local and must be replaced with a shared Redis implementation before running multiple API instances.

Run `npm install`, copy `.env.example` to `.env`, start MongoDB, then use `npm run dev`.
