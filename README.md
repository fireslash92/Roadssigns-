Road Sign Lens Pro v4.0 — map layout fix

This release retains the working v3.8 MobileCLIP model setup and existing scan/record functionality.
The mobile screenshot showed widely scattered map tiles and missing Leaflet controls, consistent with map CSS failing to load. Critical Leaflet layout rules are now embedded directly in index.html so tiles retain correct positions if external Leaflet CSS fails.

Extract ZIP, upload files to GitHub Pages main branch root (no Actions). Keep existing browser records; do not clear website data. Refresh after commit. If map tiles still fail or appear blank, screenshot again; tile servers may be blocked and real-device confirmation is outstanding.
