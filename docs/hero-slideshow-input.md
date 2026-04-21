# Hero Slideshow Input Guide

This guide explains how to replace the "Nutritious meals made simple" hero text block with a scrolling slideshow of main dishes.

## Short answer

Yes — the slideshow should primarily use **images**.

Recommended per slide:
- 1 dish image (required)
- dish name (required)
- short subtitle/tagline (optional)
- CTA link (optional, e.g., `#menu` or a plan page)

## Recommended file format

Use a CSV at repo root named `hero_slides.csv`.

### Required columns

- `slide_id` — unique ID (`H001`, `H002`, ...)
- `title` — dish title shown on slide
- `image_url` — image path/URL (local or CDN)
- `status` — `live` or `hidden`
- `sort_order` — numeric order (1, 2, 3...)

### Optional columns

- `subtitle` — short one-liner under title
- `cta_label` — button text
- `cta_href` — link target
- `alt_text` — accessibility text for image

## Example CSV

```csv
slide_id,title,subtitle,image_url,cta_label,cta_href,alt_text,status,sort_order
H001,Ragi Collagen Chicken Soup,Protein-rich warm starter,assets/images/hero/ragi-soup.jpg,Explore Menu,#menu,Ragi collagen chicken soup in a bowl,live,1
H002,Mesclun Quinoa Salad,Fresh and filling lunch option,assets/images/hero/quinoa-salad.jpg,View Plans,plans.html,Mesclun quinoa salad with greens and seeds,live,2
H003,ABC Smoothie,Clean fruit-and-veg blend,assets/images/hero/abc-smoothie.jpg,Order Now,https://order.cherisheverybite.com/outlet/56752198194843,ABC smoothie in a glass bottle,live,3
```

## Image specifications

For best quality/performance:
- Aspect ratio: 16:9 (preferred) or 4:3
- Width: 1600–1920 px
- Format: WebP (preferred), JPG fallback
- Size target: under 300 KB each (hero images)

## Where files should go

- CSV: `hero_slides.csv`
- Local images: `assets/images/hero/`

## How to provide images to me

You can share images in either of these ways:

1. **Upload image files directly in this workspace**  
   Put them in `assets/images/hero/` with clear names (example: `ragi-soup.jpg`).

2. **Share public image URLs**  
   I can place those URLs in `hero_slides.csv` under `image_url`.

To proceed quickly, send:
- image filename or URL,
- slide title,
- optional subtitle,
- desired order number.

Then I can do the full setup (CSV entries + slideshow rendering wiring in the homepage).

## Rendering behavior recommendation

- Only render rows where `status=live`
- Sort by `sort_order` ascending
- Auto-scroll every 4–6 seconds
- Show manual controls (prev/next + dots)
- Pause auto-scroll on hover/focus
- Include keyboard support and `aria-live="polite"`

## Content checklist

- Use real plated dish photos (not stock if possible)
- Keep title <= 45 characters
- Keep subtitle <= 80 characters
- Ensure every `image_url` is valid and every slide has `alt_text`
