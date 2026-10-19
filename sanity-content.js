/* Public content only. Sanity tokens must never appear in this file. */
const SANITY_PROJECT_ID = '597y0bha';
const SANITY_DATASET = 'production';
const SANITY_VERSION = '2025-02-19';
const SANITY_QUERY = '*[_type == "siteSettings" && _id == "siteSettings"][0]{..., "projects": *[_type == "portfolioProject"] | order(order asc){name,description,category,href,"img":coalesce(image.asset->url, imageUrl),color}}';
window.loadPortfolioContent = async function () {
  const endpoint = 'https://' + SANITY_PROJECT_ID + '.api.sanity.io/v' + SANITY_VERSION + '/data/query/' + SANITY_DATASET + '?query=' + encodeURIComponent(SANITY_QUERY);
  const response = await fetch(endpoint, {cache:'no-store'});
  if (!response.ok) throw new Error('Sanity returned ' + response.status);
  const json = await response.json();
  if (!json.result) throw new Error('Sanity site content not yet published');
  return json.result;
};
