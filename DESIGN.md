# Dragon Studio

Single-client barber booking app, Nueva Imperial. Visual reference: the shop's Setmore page (https://drgonstudio.setmore.com) and Instagram (@dragonstudio.cl) — black and white dragon logo with a serif "DRAGON STUDIO" wordmark.

Direction: monochrome. Black, off-white and greys only, matching the logo. Anime nods are minimal and grey: faint speed lines behind the home hero, dashboard headers and the barber profile card, and thick white "manga panel" borders on the photo gallery. No accent colors; red is reserved for errors and destructive actions.

Palette (CSS tokens in `frontend/src/index.css`): page #0d0d0d, surfaces #161616 / #1e1e1e, lines #2c2c2c / #464646, text #f2f0eb, secondary #a9a7a2, faint #7d7b77, danger text #ff9e9e. Primary buttons are off-white with near-black text; the closing CTA on the home page is an inverted off-white band.

Typography: Cormorant Garamond (serif, subset woff2) for the wordmark, all h1 and section titles, prices; DM Sans variable (woff2) for interface text. Both served locally from `frontend/public/brand`.

Public home: centered hero with the animated logo (`HeroLogo`: transparent wordmark and dragon layers cut from `dragon-banner.png`; the wordmark reveals left to right, the dragon slides in, then floats with a soft glow and follows the pointer slightly on desktop; all motion off under prefers-reduced-motion), headline, booking CTAs and address/phone row; gallery of approved portfolio photos from all barbers (falls back to photos from the shop's Instagram in `public/brand/galeria` when none are approved); numbered service list; sticky shop card; team cards; studio section; inverted closing CTA. Gallery photos render in greyscale and reveal color on hover/focus. At 900px one column; at 640px the gallery becomes a 2-column grid.

Barber profile: card with speed lines, booking card, then "Sus trabajos" gallery with the barber's approved photos. Gallery opens a native `<dialog>` lightbox with arrow-key navigation.

Portfolio flow: barbers upload photos from the "Mis trabajos" tab (JPG/PNG/WebP, 8 MB, 30 per barber); photos stay PENDING until an admin approves them in the "Galería" tab of the admin panel. Admin uploads are approved automatically. Only APPROVED photos are public.

Internal pages still use Tailwind slate/white/brand utilities; `index.css` remaps them to the monochrome palette, so prefer the shared classes (`panel`, `dash-hero`, `tabs`, `btn-primary`, `input-field`, `field-label`, `section-eyebrow`) for new UI.

Shared controls: minimum 46px primary actions, 48px inputs, visible off-white focus ring, native dark date/time controls, reduced-motion support. Prices formatted as CLP.

Photos in `public/brand/galeria` come from the shop's Instagram, cropped to remove the carousel arrows and dots. Ask clients for consent before publishing photos that show their face.
