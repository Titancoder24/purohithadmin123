const areaGroups = {
  South: ["Jayanagar", "JP Nagar", "Banashankari", "Basavanagudi", "BTM Layout", "Bannerghatta Road", "Wilson Garden", "Adugodi", "Madiwala", "Bommanahalli", "Begur", "Akshaya Nagar", "Hulimavu", "Arekere", "Gottigere", "Konanakunte", "Kumaraswamy Layout", "Padmanabhanagar", "Uttarahalli", "Girinagar", "Hanumanthanagar"],
  "South East": ["Koramangala", "HSR Layout", "Sarjapur Road", "Bellandur", "Electronic City", "Ejipura"],
  East: ["Indiranagar", "Whitefield", "Marathahalli", "KR Puram", "Mahadevapura", "Brookefield", "Hoodi", "Kadugodi", "Varthur", "Panathur", "Kundalahalli", "Doddanekundi", "CV Raman Nagar", "Jeevan Bima Nagar", "Domlur", "HAL"],
  Central: ["Ulsoor", "Richmond Town", "Shantinagar", "Chamarajpet", "Chickpet", "Cottonpet", "Majestic", "Seshadripuram", "Vasanth Nagar", "Shivajinagar", "Frazer Town", "Cox Town", "Cooke Town", "Benson Town"],
  West: ["Malleswaram", "Rajajinagar", "Vijayanagar", "Yeshwanthpur", "Mathikere", "Peenya", "Nagarbhavi", "Chandra Layout", "Basaveshwaranagar", "Kamakshipalya", "Magadi Road", "Mysore Road", "Nandini Layout", "Laggere", "Kengeri", "Rajarajeshwari Nagar"],
  North: ["Yelahanka", "Hebbal", "RT Nagar", "Sadashivanagar", "Sanjaynagar", "Dollars Colony", "Jalahalli", "Dasarahalli", "Nagasandra", "Vidyaranyapura", "Sahakara Nagar", "Kodigehalli", "Thanisandra", "Nagawara", "Jakkur", "Hegde Nagar", "Devanahalli"],
  "North East": ["Horamavu", "Banaswadi", "Kalyan Nagar", "Kammanahalli", "Hennur", "Ramamurthy Nagar", "HRBR Layout", "HBR Layout", "Budigere Cross", "Avalahalli"],
} as const;

const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const BANGALORE_AREAS = Object.entries(areaGroups).flatMap(([zone, names]) =>
  names.map((name) => ({ name, slug: slugify(name), zone })),
);

export const LOCAL_PAGE_BASE_URL = "https://purohithconnect.com/purohit-near-me";

if (BANGALORE_AREAS.length !== 100) throw new Error(`Expected 100 Bangalore areas, received ${BANGALORE_AREAS.length}`);
