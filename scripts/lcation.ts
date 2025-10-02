import fs from 'fs/promises';
import { exit } from 'process';
import Pbf from 'osm-pbf-parser'; // Lib pure JS pour parser PBF

// Villes hardcodées (modifie cette liste pour changer les villes)
const [ville, ...villes] = ['Antananarivo', 'Toamasina', 'Fianarantsoa'];

// Bounding boxes hardcodées (south, west, north, east)
const cityBBoxes: Record<string, [number, number, number, number]> = {
  Antananarivo: [-19.0700122, 47.3655809, -18.7500122, 47.6855809],
  Toamasina: [-18.3153985, 49.2498352, -17.9953985, 49.5698352],
  Fianarantsoa: [-21.5141843, 47.0357242, -21.3925891, 47.1378856],
};

if (!ville) {
  console.error('Erreur : Aucune ville définie dans le code. Ajoute des villes dans const [ville, ...villes] = [...];');
  exit(1);
}

const allCities = [ville, ...villes];
const pbfPath = 'data/madagascar-latest.osm.pbf';

async function checkPbfExists() {
  try {
    await fs.access(pbfPath);
  } catch {
    console.error(`Fichier PBF manquant : Télécharge https://download.geofabrik.de/africa/madagascar-latest.osm.pbf dans data/`);
    exit(1);
  }
}

function isInBbox(lat: number, lon: number, bbox: [number, number, number, number]): boolean {
  const [south, west, north, east] = bbox;
  return lat >= south && lat <= north && lon >= west && lon <= east;
}

async function extractAddressesForCity(bbox: [number, number, number, number], city: string): Promise<any[]> {
  const elements: any[] = [];
  const fileBuffer = await fs.readFile(pbfPath);

  console.log(`Parsing PBF pour ${city}... (peut prendre 1-2 min la première fois)`);
  const pbf = new Pbf(fileBuffer);
  const osm = pbf.readOsm();

  // Parcours des nodes (points avec adresses)
  for (const node of osm.nodes || []) {
    if (node.tags?.['addr:housenumber'] && node.lat && node.lon && isInBbox(node.lat, node.lon, bbox)) {
      elements.push({
        type: 'node',
        id: node.id,
        lat: node.lat,
        lon: node.lon,
        tags: node.tags,
      });
    }
  }

  // Parcours des ways (lignes/polygones avec adresses, utilise le centre)
  for (const way of osm.ways || []) {
    if (way.tags?.['addr:housenumber']) {
      const centerLat = way.nodes.reduce((sum: number, nd: any) => sum + (osm.nodes?.[nd]?.lat || 0), 0) / way.nodes.length;
      const centerLon = way.nodes.reduce((sum: number, nd: any) => sum + (osm.nodes?.[nd]?.lon || 0), 0) / way.nodes.length;
      if (isInBbox(centerLat, centerLon, bbox)) {
        elements.push({
          type: 'way',
          id: way.id,
          lat: centerLat,
          lon: centerLon,
          tags: way.tags,
          nodes: way.nodes, // Optionnel : refs nodes pour géométrie
        });
      }
    }
  }

  // Parcours des relations (similaire, centre approx.)
  for (const rel of osm.relations || []) {
    if (rel.tags?.['addr:housenumber']) {
      // Centre approx. via premiers membres (simplifié ; pour full, itérer members)
      let centerLat = 0, centerLon = 0, count = 0;
      for (const member of rel.members || []) {
        const nd = osm.nodes?.[member.ref];
        if (nd && nd.lat && nd.lon) {
          centerLat += nd.lat;
          centerLon += nd.lon;
          count++;
        }
      }
      if (count > 0 && isInBbox(centerLat / count, centerLon / count, bbox)) {
        elements.push({
          type: 'relation',
          id: rel.id,
          lat: centerLat / count,
          lon: centerLon / count,
          tags: rel.tags,
          members: rel.members,
        });
      }
    }
  }

  console.log(`${elements.length} adresses trouvées pour ${city}.`);
  return { elements, version: { timestamp: new Date().toISOString(), generator: 'local PBF parse' } };
}

async function main() {
  await checkPbfExists();

  for (const city of allCities) {
    try {
      if (!cityBBoxes[city]) {
        throw new Error(`BBox non définie pour ${city}. Ajoute-la dans cityBBoxes.`);
      }

      const bbox = cityBBoxes[city];
      console.log(`\n--- Traitement de ${city} (bbox: ${bbox.join(', ')}) ---`);

      const data = await extractAddressesForCity(bbox, city);

      const filename = `${city.toLowerCase().replace(/\s+/g, '_')}_addresses.json`;
      await fs.writeFile(filename, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Fichier ${filename} créé ! ${data.elements.length} adresses (avec lat/lon).`);
    } catch (error) {
      console.error(`Erreur pour ${city} :`, error);
    }
  }
  console.log('\nTraitement terminé. Les JSON sont prêts ! Mise à jour : re-télécharge le PBF si besoin.');
}

main();