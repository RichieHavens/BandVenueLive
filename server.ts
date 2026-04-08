import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Scraping
  app.post("/api/scrape", async (req, res) => {
    let { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    // Prepend https:// if protocol is missing
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!response.ok) {
        throw new Error(`Target site returned ${response.status}: ${response.statusText}`);
      }
      const html = await response.text();
      if (!html || html.length < 100) {
        throw new Error('The website returned very little content. It might be blocking automated access or require JavaScript to render.');
      }
      const $ = cheerio.load(html);
      
      // Remove scripts, styles, SVGs, iframes, and noscript
      $("script, style, svg, iframe, noscript, nav, footer, header, aside, form, button, input, select, textarea").remove();
      
      // Extract only the main content if possible, otherwise use body
      const content = $("main, article, #content, .content, body").first();
      
      // Further cleanup: remove all attributes except src, href
      content.find("*").each((_, el) => {
        const attributes = el.attribs;
        for (const attr in attributes) {
          if (!["src", "href"].includes(attr)) {
            $(el).removeAttr(attr);
          }
        }
      });

      // Remove empty tags
      content.find("*").each((_, el) => {
        if ($(el).children().length === 0 && !$(el).text().trim() && !$(el).is("img")) {
          $(el).remove();
        }
      });

      let cleanedHtml = content.html() || "";
      let textContent = content.text() || "";
      
      // Collapse whitespace
      cleanedHtml = cleanedHtml.replace(/\s+/g, " ").trim();
      textContent = textContent.replace(/\s+/g, " ").trim();
      
      res.json({ html: cleanedHtml, text: textContent });
    } catch (error) {
      console.error("Scrape error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch website content" });
    }
  });

  // API Route for Notifications (Mock Email)
  app.post("/api/notify", async (req, res) => {
    const { type, name, details } = req.body;
    const recipient = type === 'venue' ? 'NewVenue@BandVenue.com' : 'NewBand@BandVenue.com';
    
    console.log(`[EMAIL SENT TO ${recipient}]`);
    console.log(`Subject: New ${type} added: ${name}`);
    console.log(`Details:`, details);
    
    res.json({ success: true, message: `Notification sent to ${recipient}` });
  });

  // API Route for Band Confirmation Email
  app.post("/api/send-confirmation-email", async (req, res) => {
    const { bandEmail, bandName, eventName, venueName, eventDate, link, isReminder } = req.body;
    
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: "RESEND_API_KEY not configured" });
    }

    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const subject = isReminder 
        ? `Reminder: please confirm your event at ${venueName}` 
        : `Please confirm your event at ${venueName}`;
      
      const body = isReminder
        ? `Hi ${bandName}, just a quick reminder regarding ${eventName} at ${venueName} on ${eventDate}. Please confirm here: ${link}`
        : `Hi ${bandName}, you’ve been requested for ${eventName} at ${venueName} on ${eventDate}. Please review and confirm here: ${link}`;

      await resend.emails.send({
        from: 'BandVenue <noreply@bandvenue.com>',
        to: bandEmail,
        subject: subject,
        text: body
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Email error:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
