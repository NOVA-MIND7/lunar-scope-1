# Moon textures

LUNAR SCOPE does not bundle lunar imagery. Until you add some, the 3D Moon uses a **procedural fallback**
that is clearly labelled in the interface as illustrative (not NASA data, crater positions are random).

## Use real NASA imagery

1. Download an equirectangular lunar colour/albedo map and (optionally) an elevation map from an
   authoritative NASA source, for example the NASA Scientific Visualization Studio "CGI Moon Kit"
   (built from LRO data). Check the product page for the current URL and usage terms before use.
2. Convert/resize to JPEG or PNG (2k–8k wide, 2:1 aspect ratio, longitude -180..180 left to right, north up).
3. Save as:
   - `public/textures/moon_color.jpg`
   - `public/textures/moon_elevation.jpg` (greyscale, optional — used as a bump map)
4. Set the credit line in `frontend/.env.local`:
   `VITE_MOON_TEXTURE_CREDIT="NASA/GSFC/ASU (product name and version you installed)"`

Other file names or hosts can be configured with `VITE_MOON_COLOR_TEXTURE` and `VITE_MOON_ELEVATION_TEXTURE`.
Texture orientation is verified by `src/utils/lunarCoordinates.test.ts`.
