export async function get() {
  const pages = [
    "",
    "/servicios",
    "/sobre-mi",
    "/contacto"
  ];

  const urls = pages
    .map((p) => `<url><loc>https://www.jaldelareina.es${p}</loc></url>`)
    .join("");

  return {
    body: `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls}
    </urlset>`
  };
}
