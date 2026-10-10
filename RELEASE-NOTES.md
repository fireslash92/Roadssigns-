# Road Sign Lens Pro — v3.0 release notes (2026-10-10)

**Release type: prototype suitable for field testing, not validated for road safety or official inventory acceptance.**

## Implemented compared with v2

- Completely redesigned 5-tab adaptive mobile/desktop user experience, desktop navigation, iPhone bottom navigation.
- Fast, frame-by-frame color/geometry sign-region proposals with temporary region tracking IDs.
- Background on-device sign-type suggestions via visual similarity on cropped regions; adjustable interval, start/stop camera, picture analysis.
- Optional automatic provisional observations and proximity-based duplicate suppression.
- GPS quality indication, phone-coordinate labeling, map adjustment and manually editable coordinates.
- Reviewable inventory: add, edit, delete, status, observations, sign/post condition, road, notes.
- Exports to CSV / GeoJSON / KML, including review metadata and explicit location source.
- Arabic/English toggle, RTL, W3C WCAG 2.2 AA design target with high contrast, enlarged text, reduced motion, keyboard-friendly alternative map list and live status alerts.
- PWA add-to-home-screen, browser-local history and v2 migration.

## Tests completed

- 6 Node unit tests passed (color proposals, ordinary backgrounds, GPS distance & validation, auto dedup, GeoJSON data, temporary object tracking IDs).
- Browser-based UI checks: desktop and 390px mobile; no horizontal overflow; tab navigation; add manual observation; Arabic switch; dialog editing.
- Browser workflow simulated with a mock AI result: input sign image → one proposed region → recognition match → inventory record.

## Not yet tested / certified

- Real iPhone camera/GPS permissions and thermal performance.
- Live AI model hosting/CDN availability in the user's actual network.
- Sign identification precision/recall in Omani roads, night, glare, rain, distance, different signage.
- Physical signpost positioning error (phone GPS may be tens of metres away from sign).
- Formal WCAG 2.2 AA conformance and iOS VoiceOver audit.
- Map rendering in this test environment; external mapping library/tile network not available in the testing browser.

## Practical next milestone

Replace color-based proposals and visual-similarity classification with an Oman-trained, evaluated traffic-sign **object detection** model that yields stable bounding boxes and calibrated thresholds. For authoritative signpost coordinates, implement manual surveying, high-accuracy GNSS or multi-view geospatial estimation; add secure central storage and role-based review for a government GIS registry.
