# Boats icons (v5)

Library: Lucide, `lucide-react`. Stroke 1.5 (`strokeWidth={1.5}`), 20px in content, 24px in nav, 2px stroke only on the active tab. Color inherits text. Never filled.
Status uses signal flags, not icons: `<Flag code="P|C|N|U|H|Q" />` from flags.tsx (21x14 in lists, 30x20 on cards).

| Where | Icon |
|---|---|
| Tabs, crew | House, Compass, Activity, UserRound |
| Tabs, captain | ShipWheel, Rocket, ArrowLeftRight, UserRound |
| Face ID buttons | ScanFace |
| Worst case line | ShieldCheck |
| Lock line | Lock |
| Alerts | Bell, TriangleAlert (near floor) |
| arcscan links | ExternalLink |
| Gain delta | ArrowUpRight |
| Invite | MessageCircle (WhatsApp), Copy |
| Explore | Search, SlidersHorizontal |
| AI captain | Bot, Mic (voice rule), Clock (decision log) |
| Hints | Info |
| Keypad | Delete |
| Back | ChevronLeft |
| Metadata pairs | UserRound (captain), Bot (AI), History (voyages), TrendingUp (avg), Calendar (dates), Clock (times), ShieldCheck (inside rules), Zap (speed), BadgeCheck (no fees), ChartNoAxesColumn (odds) |

Metadata is never joined with "·". Use `<Meta icon={Clock}>2 h ago</Meta>`: 13px icon, 4px gap, 12px between pairs. List rows: 18px icon in a 36px tile (radius 10, bg #EEF1F6), divider inset to the text.
