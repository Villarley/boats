# Entrada y salida de dinero con Swapped: plan de integración

Investigado el 2026-11-20. Fuentes principales: la documentación de desarrolladores en `docs.swapped.com` y los endpoints públicos `widget.swapped.com/api/v1/merchant/*`, consultados en vivo ese día. **swapped.com (el sitio comercial) bloquea el acceso automatizado** con un desafío de Cloudflare: lo comercial (fees de merchant, partners, entidad legal) sale de resultados de búsqueda y está marcado **[sin verificar]**. Lo que solo puede responder el equipo de partners o ventas de Swapped va marcado **[preguntar a Swapped]**.

**Resumen**
- Swapped ofrece un **widget en iframe** (comprar y vender) con URL firmada en el servidor, **webhooks** firmados con HMAC y algunos endpoints REST (precio, métodos, estado). No documenta SDK npm ni white-label.
- **No soporta Arc** (ni mainnet ni testnet). Sí soporta USDC en Base, Ethereum, Arbitrum, Polygon, Solana, Monad y otras redes. Plan B: comprar USDC en Base y traerlo a Arc con CCTP de Circle.
- El **sandbox solo tiene BTC/ETH de testnet** y tarjeta de prueba (máximo 15 EUR), así que no hay forma de probar de punta a punta con dólares en Arc testnet. El faucet se queda para testnet.
- Entrada en LatAm: tarjeta, Apple Pay y Google Pay en AR, MX y CL; SPEI en MX y PIX en BR. **Salida: en AR, MX y CL solo transferencia bancaria en EUR, DKK o GBP**. D4 tal como está diseñado (a tarjeta en minutos, a banco local) no se puede hacer con Swapped hoy.
- Recomendación: hacer **primero la entrada (D1–D3)** con el Plan B (Base → CCTP → Arc) mientras se le pide a Swapped que agregue USDC en Arc. Dejar la **salida (D4) bloqueada** hasta que haya pagos locales en LatAm, o usar otro proveedor para eso.

---

## 1) Qué es Swapped y qué nos sirve

### Productos

| Producto | Qué es | ¿Nos sirve? | Fuente |
|---|---|---|---|
| **Ramp (on-ramp)** | Widget embebible para comprar cripto. Flujo: monto → método → login con código (OTP) → dirección → pago → entrega | **Sí, es el núcleo** | https://docs.swapped.com/swapped-ramp/readme-1 |
| **Ramp (off-ramp)** | Widget `widget.swapped.com/sell`: vender cripto y recibir fiat. Incluye la modalidad "el merchant envía la cripto por el usuario" (`userSendsFunds=false`) | Sí en teoría; hoy no tiene pagos útiles en LatAm (ver abajo) | https://docs.swapped.com/swapped-ramp/off-ramp-integration/iframe-initialization |
| **Endpoints REST** | `merchant/pricing`, `get_payment_methods`, `get_supported`, `get_min_amount`, `get_status`, `get_transactions`, `sell/pricing`, `sell/get_payout_methods` | Sí: cotizar en D1 y conciliar órdenes | https://docs.swapped.com/swapped-ramp/endpoints |
| **Connect** | Depósitos desde exchanges y wallets (Binance, Coinbase, MetaMask…) | No por ahora (nuestro público no tiene cripto) | https://docs.swapped.com/swapped-connect/connect-integration |
| **Dashboard** | `dashboard.swapped.com`: volumen, órdenes, webhook global, markup ("Affiliate Fee") | Sí (operación) | https://docs.swapped.com/swapped-ramp/readme-1 · https://docs.swapped.com/swapped-ramp/endpoints/offramp-endpoints/get-current-price |

- **Widget, API o SDK:** el producto es un **iframe** (o un link). No hay SDK npm documentado. La API REST sirve para cotizar y consultar; **no hay endpoint documentado para crear órdenes sin el widget**. QuickNode dice que se puede "build a fully custom flow on the API" (https://www.quicknode.com/builders-guide/tools/swapped-ramp-by-swapped-com). **[sin verificar]** **[preguntar a Swapped]**
- **White-label / embebido:** no está documentado (ni marca, ni colores, ni textos). Lo más cercano es el modo **"Aggregator Partners"**: si pasamos `currencyCode`, `baseCurrencyCode`, `baseCurrencyAmount` y `method`, el widget **salta la pantalla inicial y la de confirmación y va directo al resumen**. Con `walletAddress` también salta la pantalla de dirección (https://docs.swapped.com/swapped-ramp/readme-1/onramp-aggregator-partners). **[preguntar a Swapped]**: si podemos usar ese modo y si se puede ocultar "USDC", "wallet" y "KYC".
- **Tema (claro/oscuro) e idioma:** **no hay parámetros `theme` ni `lang` documentados**. El widget soporta español entre 34 idiomas (https://docs.swapped.com/swapped-ramp/misc./supported-languages). **[preguntar a Swapped]**
- **Tamaño del iframe:** está optimizado para 400×482 px y el ejemplo usa `allow="… camera; payment; …"` (https://docs.swapped.com/swapped-ramp/readme-1/iframe-initialization). Entra en nuestro sheet (máximo 520) y en el diálogo de 440.

### Parámetros de la URL de compra (`https://widget.swapped.com/?…`)
Fuente: https://docs.swapped.com/swapped-ramp/readme-1/iframe-initialization

| Parámetro | Uso para nosotros |
|---|---|
| `apiKey` (obligatorio) | Clave pública `pk_…` |
| `signature` (obligatorio, **último parámetro**) | HMAC-SHA256 del query string (con el `?`) firmado con la `sk_…`, en base64 y URL-encoded. **Se genera solo en el servidor** |
| `currencyCode` (obligatorio) | `USDC_BASE` (Plan B). Si Swapped agrega Arc, el código que usen |
| `walletAddress` (obligatorio) | Dirección de destino (ver §2 cuál) |
| `baseCurrencyCode` + `lockBaseCurrency` | `USD` (o MXN para SPEI) |
| `baseCurrencyAmount` + `lockAmount=true` | El monto que eligió el usuario en D1 (máximo 2 decimales) |
| `method` | `payment_group`: `apple-pay`, `creditcard`, `google-pay`, `spei`, `pix`… |
| `baseCountry` | ISO del país: define qué métodos aparecen |
| `externalCustomerId` | Nuestro id de usuario (vuelve en el webhook) |
| `email` | Prellena el login OTP de Swapped |
| `redirectUrl` | Vuelta a la app, con `{orderId}` y `{orderStatus}` |
| `responseUrl` | Webhook de esta orden (tiene prioridad sobre el global del dashboard) |
| `minAmount` | En EUR, no menos de 7 |
| `markup` | 0–5 %: ingreso para Boats (choca con el "sin comisiones" del diseño, ver §6) |
| `customerKYC`, `kycShareToken` | Reusar la verificación solo si usamos **Sumsub** (https://docs.swapped.com/swapped-ramp/readme-1/sharing-sumsub-verification). No aplica hoy |
| `submerchant` | Multi-tenant (no aplica) |

### Webhooks
Fuentes: https://docs.swapped.com/swapped-ramp/readme-1/order-notifications · https://docs.swapped.com/swapped-ramp/misc./order-notification-retry-policy

- **Destino:** `responseUrl` de la orden o, si no hay, el webhook global en `dashboard.swapped.com/developers`. Queda fijo al crear la orden.
- **Firma:** header `signature` = HMAC-SHA256(cuerpo crudo, secret key) en base64. Hay que verificarla sobre el **body crudo**.
- **Eventos de compra:**
  - `payment_pending`: orden creada, falta el pago.
  - `order_completed`: pago aprobado.
  - `order_broadcasted`: transacción enviada a la red. Trae `transaction_id` y es **estado final**.
  - `order_cancelled`: estado final.
- **Payload:** `order_id`, `order_status`, `order_crypto`, `order_crypto_amount`, `order_crypto_address`, `network`, `order_amount_usd(_plus_fees)`, `external_customer_id`, `transaction_id`.
- **Eventos de venta:** `payment_pending` → `order_processing` → `payout_pending` → `order_completed` / `order_cancelled` (https://docs.swapped.com/swapped-ramp/off-ramp-integration/order-notifications).
- **Reintentos:** hasta 24 h (1/min ×5, luego cada 10, 20 y 30 min, después cada hora). Un 200 o un 409 corta los reintentos. **Pueden llegar duplicados: hay que ser idempotentes por `order_id`.**
- **Respaldo:** `POST merchant/get_status` devuelve el último webhook intentado y `POST merchant/get_transactions` lista todas las órdenes, firmado con timestamp (https://docs.swapped.com/swapped-ramp/endpoints/misc.-endpoints/get-payment-status · https://docs.swapped.com/swapped-ramp/endpoints/misc.-endpoints/get-transactions).
- **Eventos en el navegador:** solo está documentado `postMessage` `SWAPPED_ORDER_DATA` en el widget de **venta** (https://docs.swapped.com/swapped-ramp/off-ramp-integration/iframe-initialization). Para la compra no hay eventos de frontend documentados. **[preguntar a Swapped]**

### Sandbox y claves
- **Sandbox:** `https://sandbox.swapped.com` (venta en `/sell`), con claves públicas compartidas `pk_sandbox_…`/`sk_sandbox_…` publicadas en https://docs.swapped.com/swapped-ramp/readme-1/sandbox-environment.
  - **Solo BTC y ETH de testnet** (Sepolia) y solo Visa/Mastercard con la tarjeta de prueba (https://docs.swapped.com/swapped-ramp/readme-1/test-card).
  - Máximo 15 EUR por pago.
  - **No hay USDC ni Arc en sandbox.**
  - **No está documentada la URL base de la API REST en sandbox.** **[preguntar a Swapped]**
- **Claves de producción y cuenta de merchant:** se gestionan en `dashboard.swapped.com`. **No está documentado cómo darse de alta** (no hay formulario público en los docs). **[preguntar a Swapped / ventas]**
- **Límite de la API:** `/merchant/*` permite 100 req/s.

### Comisiones (al usuario final)
Fuente: endpoint en vivo `https://widget.swapped.com/api/v1/merchant/get_payment_methods`, consultado el 2026-11-20. Fórmula `fee% + base_fee EUR` según https://docs.swapped.com/swapped-ramp/endpoints/onramp-endpoints/get-payment-methods.

| Método | Comisión | Mín / Máx (EUR) |
|---|---|---|
| Tarjeta (`creditcard`, crédito y débito) | 1,75 % + 0,35 EUR | 7 / 100.000 |
| Apple Pay / Google Pay | 1,75 % + 0,35 EUR | 7 / 100.000 |
| SPEI (MX, MXN) | 1,5 % + 0,20 EUR | 7 / 10.000 |
| PIX (BR, BRL) | 4,82 % + 0,40 EUR | 7 / 2.400 |
| Transferencia bancaria (solo EUR) | 0,5 % | 7 / 1.000.000 |

- **Además:**
  - Un **spread** variable según el método (https://help.swapped.com/en/articles/15857640-what-fees-do-you-charge).
  - Una comisión de red: USDC en Base cuesta 0,01 EUR según `get_supported`.
  - Nuestro `markup` opcional.
- **Mínimo:** 7 EUR / 8 USD (`get_min_amount`). El precio para tarjeta queda fijo por unos 10 s en el resumen.
- **Comisiones para el merchant:** no están documentadas. La página de referidos habla de comisión al referidor (https://swapped.com/referral-program). **[sin verificar]** **[preguntar a Swapped]**
- **Entidad legal:** según un resultado de búsqueda, Northstake ApS es el merchant of record para la UE/EEE (CASP ante la FSA de Dinamarca). **[sin verificar]**

### Verificación de identidad (la hace Swapped)
- **Pasos:** login con código por email (OTP) o Google; luego documento + selfie con prueba de vida, prueba de domicilio y un **número de identificación fiscal en la primera operación**.
- **Más controles:** origen de fondos con volúmenes muy altos. Los umbrales no se publican (https://help.swapped.com/en/articles/15857377-what-kyc-checks-are-required).
- **Política:** debida diligencia desde EUR 0 (https://swapped.com/legal/kyc-aml-policy). **[sin verificar: vía buscador]**
- **Revisión manual:** algunas órdenes tardan 10–30 min (https://docs.swapped.com/swapped-ramp/misc./faq).
- **Contracargos:** los gestiona Swapped, sin penalidad para el merchant.
- **Reembolsos:** requieren que **el merchant devuelva la cripto** a Swapped (misma FAQ). Es un riesgo operativo para nosotros.

### Países y métodos (LatAm)
Fuente: endpoints en vivo `get_supported` (155 países) y `get_payment_methods`, 2026-11-20. Lo disponible con *nuestra* `apiKey` puede variar: el endpoint acepta `?apiKey=`.

| País | ¿Soportado? | Moneda por defecto | Entrada | Salida (`sell/get_payout_methods`) |
|---|---|---|---|---|
| Argentina | Sí | **USD (no hay ARS)** | Tarjeta, Apple Pay, Google Pay (USD), Skrill, Neteller, PaySafeCard, banco solo EUR | Solo banco EUR/DKK/GBP |
| México | Sí | MXN | Tarjeta, Apple Pay, Google Pay, **SPEI (MXN)** | Solo banco EUR/DKK/GBP |
| Chile | Sí | USD (CLP está en la lista de fiat, pero la tarjeta no lo acepta) | Tarjeta, Apple Pay, Google Pay (USD), Caixa (6,7 %) | Solo banco EUR/DKK/GBP |
| Brasil | Sí | BRL | Tarjeta, Apple Pay, Google Pay, **PIX** | **PIX (BRL)**, banco EUR |

- **Otras restricciones:** usuarios de **Texas** no pueden comprar stablecoins (https://docs.swapped.com/swapped-ramp/readme-1/supported-cryptocurrencies).
- **Métodos de pago documentados** (https://docs.swapped.com/swapped-ramp/off-ramp-integration/supported-payout-methods):
  - Global: `bank-transfer` (EUR/DKK/GBP) y `skrill`.
  - Brasil: `pix`.
  - Canadá: `interac-extra`.
  - **No hay pago a tarjeta.**

---

## 2) Compatibilidad con Arc

**Swapped no soporta Arc.**
- `get_supported` (en vivo, 2026-11-20) lista estas redes: arbitrum, avalanche, base, bitcoin, bitcoin-cash, bsc, cardano, cosmos, dogecoin, ethereum, hype, hypercore, litecoin, monad, noble, optimism, osmosis, polygon, robinhood, solana, ton, tron, worldcoin, xrp.
- La tabla de cripto de los docs tampoco incluye Arc (https://docs.swapped.com/swapped-ramp/readme-1/supported-cryptocurrencies).
- **USDC disponible en:** `USDC_BASE`, `USDC_ETHEREUM`, `USDC_ARBITRUM`, `USDC_POLYGON`, `USDC_AVALANCHE`, `USDC_SOLANA`, `USDC_MONAD`, `USDC_BSC`, `USDC_NOBLE`, `USDC_HYPE`/`HYPERCORE`, `USDCE_*`.

**Contexto Arc y Circle:**
- La mainnet de Arc salió el 2026-09-16 (https://www.circle.com/pressroom/circle-launches-arc-mainnet-an-economic-operating-system-for-the-internet). Nuestra app sigue en **Arc testnet**: el dinero real exige migrar a mainnet primero, como proyecto aparte.
- CCTP soporta **Arc (dominio 26)** y **Base (dominio 6)**, cada mainnet con su testnet. También el **Forwarding Service**: Circle ejecuta el mint en destino, así que no hace falta gas ni firma en Arc (https://developers.circle.com/cctp/concepts/supported-chains-and-domains · https://developers.circle.com/cctp/concepts/forwarding-service).
- Circle Modular Wallets (MSCA, nuestras passkeys) soporta **Arc y Base** (https://developers.circle.com/wallets/supported-blockchains).

### Opciones

| Opción | Cómo | Pros | Contras |
|---|---|---|---|
| **A. Swapped agrega USDC en Arc** | `currencyCode=USDC_ARC` (nombre a confirmar), `walletAddress` = dirección del usuario en Arc | Lo más simple: el webhook llega y refrescamos el saldo | Depende de Swapped. Ya sumaron redes nuevas (Monad, HyperEVM, Robinhood), así que vale pedirlo. **[preguntar a Swapped]** |
| **B. (recomendada mientras tanto) Base + CCTP con "forwarder" por usuario** | Desplegamos en Base un contrato forwarder por usuario con dirección CREATE2 determinística, que solo puede hacer `depositForBurn` de CCTP hacia **la dirección del usuario en Arc**, con el hook del Forwarding Service. Swapped entrega `USDC_BASE` a esa dirección. Al llegar `order_broadcasted`, nuestro backend despliega y dispara el forwarder (paga gas en Base) y Circle hace el mint en Arc | El usuario no firma nada extra ni necesita gas. No custodial (el contrato no puede mandar a otro lado). Funciona igual para usuarios con passkey y con clave local | Un contrato más que auditar, un relayer con ETH en Base y unos minutos extra. **[preguntar a Swapped]**: si aceptan un contrato como `walletAddress` y si hay controles de "wallet propia" o travel rule |
| C. Base a la cuenta del propio usuario + bridge firmado por él | Swapped entrega a la cuenta del usuario en Base (misma MSCA, si la dirección coincide entre redes). Después el usuario firma con Face ID un burn de CCTP en Base hacia Arc | Sin contrato propio | Un paso extra visible. Usuarios con clave local necesitarían gas en Base. Hay que verificar que la dirección MSCA sea la misma en Base y en Arc. **[sin verificar]** |
| ~~D. Wallet de Boats en Base que reenvía~~ | Swapped paga a una wallet nuestra y nosotros mandamos a Arc | Simple | **Custodia de fondos de terceros** (riesgo regulatorio). Descartada |

**Testnet:** el sandbox de Swapped no tiene USDC, así que **en Arc testnet seguimos con el faucet** (`/api/faucet`). El sandbox sirve para probar firma de URL, iframe, webhooks e idempotencia con ETH Sepolia. El tramo CCTP Base Sepolia → Arc Testnet se prueba aparte, con USDC del faucet de Circle.

---

## 3) Flujo propuesto, pantalla por pantalla

Leyenda: 🟦 nuestra UI · 🟧 widget de Swapped (iframe) · ⬛ sistema operativo

### Entrada de dinero ("Agregar dinero" / "Invertir en {fondo}")

1. **🟦 D1 · Pagar con** (`d1-pay-with.tsx`)
   - El usuario elige monto (chips o teclado) y método: Apple Pay, tarjeta o "saldo Boats" (este último no usa Swapped).
   - Al cambiar monto o método llamamos `POST /api/ramp/quote` (que usa `merchant/pricing`) y mostramos "Pagás $X" real.
   - **El texto actual "· no fees" no es cierto** salvo que Boats absorba la comisión. Ver §6.
   - Mapeo de métodos: `applePay`→`apple-pay`, `card`→`creditcard`. Extras por país: `spei` (MX), `pix` (BR).
   - El país sale de `baseCountry`, inferido del header de geo IP del hosting (p. ej. `x-vercel-ip-country`) y corregible por el usuario.
   - "Continuar" llama `POST /api/ramp/session`, que devuelve la URL firmada.
2. **🟦 D2 · Verificá que sos vos** (`d2-verify.tsx`)
   - Pantalla nuestra que **prepara** al usuario: "foto de tu documento + selfie, solo la primera vez".
   - La mostramos si esa cuenta nunca completó una orden (lo sabemos por nuestra tabla de órdenes). Swapped no expone una API de "estado de verificación del cliente". **[preguntar a Swapped]**
   - Agregar al paso 1 que **pide un código por email** y **un número fiscal**: lo hace Swapped y hoy el mock no lo menciona.
3. **🟧 Widget de Swapped** en bottom sheet o diálogo (iframe 400×482, `allow="camera; payment; clipboard-write; …"`)
   - Con los parámetros de "aggregator" va directo al resumen.
   - El usuario hace login con OTP, la verificación (documento, selfie, número fiscal; solo la primera vez) y paga.
   - Nosotros no tocamos la tarjeta.
4. **⬛ D3 · Apple Pay** (`d3-apple-pay.tsx`)
   - La hoja la abre **el widget de Swapped**, no nosotros. El mock queda como referencia visual.
   - Riesgo: Apple Pay dentro de un iframe de otro origen. **[preguntar a Swapped]** Si no funciona, abrir el widget a pantalla completa (redirección o `window.open`) y volver con `redirectUrl`.
5. **🟦 Nueva: "Tu dinero está en camino"** (`/add/done?orderId=…`; no está en D1–D4, hay que diseñarla)
   - Llegamos por `redirectUrl` o cuando el usuario cierra el iframe.
   - Consultamos `GET /api/ramp/orders/[id]` cada ~5 s y mostramos:
     - `payment_pending` → "Procesando tu pago"
     - `order_completed` → "Pago aprobado"
     - `order_broadcasted` → "Llegando a tu cuenta" (Plan B: además se espera el bridge, ~minutos)
     - `credited` (estado nuestro, cuando vemos el saldo en Arc) → "Listo"
   - Al final llamamos `refresh()` del store.
   - Si el flujo empezó como "Invertir en {fondo}", ofrecemos **"Invertir con Face ID"**. Invertir requiere la firma del usuario: no se puede invertir automático sin session keys.

**Cómo pasamos la dirección:** la toma el servidor del body de `/api/ramp/session`. Es la dirección del usuario ("Account ID", `wallet.address` del store) en el Plan A, o la dirección CREATE2 de su forwarder en Base en el Plan B. Va firmada en la URL, así el usuario no puede cambiarla ni la ve. `externalCustomerId` lleva nuestro id (la misma dirección o un id interno).

**Cómo nos enteramos de que llegó:**
```
Swapped ──POST──▶ /api/ramp/swapped/webhook
   ├─ verifica la firma HMAC sobre el body crudo (si falla → 401)
   ├─ upsert idempotente por order_id + estado (si ya está procesado → 200)
   ├─ si order_broadcasted y Plan B → encola un "bridge" (relayer: deploy + forward en Base;
   │                                  CCTP + Forwarding Service hace el mint en Arc)
   └─ responde 200
Cliente (/add/done) ──poll──▶ /api/ramp/orders/[id] ──▶ estado desde la DB
                                       └─ "credited" cuando el saldo de USDC en Arc sube
                                          (o vemos el evento de mint de CCTP) ──▶ store.refresh()
Cron (cada 10 min) ──▶ merchant/get_transactions para conciliar webhooks perdidos
```

### Salida de dinero (D4 · Retirar)
- **Con Swapped hoy no se puede cumplir el diseño:** no hay pago a tarjeta ("minutos"), y en AR, MX y CL solo hay banco en EUR/DKK/GBP. Brasil tiene PIX.
- **Propuesta:** dejar D4 detrás de un flag hasta que Swapped tenga pagos locales en LatAm (**[preguntar a Swapped]**: hoja de ruta para SPEI, CBU/CVU y transferencia CLP), o evaluar otro proveedor solo para la salida.
- **Si se hace** (por ejemplo para Brasil o cuentas EUR):
  1. **🟦 D4** monto y destino. Primero se sale del fondo con el flujo de retiro existente.
  2. `POST /api/ramp/sell-session` arma la URL `widget.swapped.com/sell` con `userSendsFunds=false`, `cryptoCurrencyCode=USDC_BASE`, `cryptoCurrencyAmount`, `fiatCurrencyCode`, `method`, `baseCountry`.
  3. **🟧** El widget pide OTP, verificación y datos de cobro; luego emite `SWAPPED_ORDER_DATA` con la dirección y el monto de depósito.
  4. **🟦** "Confirmar con Face ID": la cuenta del usuario firma en Arc un burn de CCTP con `mintRecipient` = dirección de depósito de Swapped en Base, usando el Forwarding Service.
  5. Los webhooks `order_processing` → `payout_pending` → `order_completed` alimentan la pantalla de estado.
- **Riesgos de la salida:** el monto neto después de las comisiones de CCTP tiene que coincidir exactamente. Y no sabemos si Swapped acredita depósitos que llegan por un mint de contrato. **[preguntar a Swapped]**

---

## 4) Cambios técnicos en la app (sin código)

**Nuevas rutas API** (`app/src/app/api/ramp/…`, runtime Node):

| Ruta | Qué hace |
|---|---|
| `POST /api/ramp/quote` | Recibe `{amount, method, country}`, llama `merchant/pricing` y devuelve total, comisiones y mínimo. Cache corta |
| `POST /api/ramp/session` | Recibe `{address, amount, method, country, fundId?}`. Valida la dirección (`isAddress`), crea la orden local `pending`, arma y firma la URL (`responseUrl`, `redirectUrl`, `externalCustomerId`) y devuelve `{url, localId}` |
| `POST /api/ramp/swapped/webhook` | Lee `req.text()`, verifica `signature` con comparación de tiempo constante, hace upsert idempotente y, en el Plan B, encola el bridge |
| `GET /api/ramp/orders?address=` y `/api/ramp/orders/[id]` | Estado para la pantalla "en camino" y para Actividad |
| `POST /api/ramp/bridge` (interna, con secreto) o job | Plan B: desplegar y disparar el forwarder en Base. Reintentable |
| Cron `/api/ramp/reconcile` | `get_transactions` + `get_status` para órdenes abiertas hace más de N min |
| (Salida) `POST /api/ramp/sell-session` | Ídem, para `/sell` |

**Librería servidor:** `app/src/lib/server/swapped.ts`, con firma de URL, verificación de webhooks y un cliente para `pricing`/`get_status`/`get_transactions`. La **secret key nunca va al cliente**.

**Persistencia:** hoy las invitaciones viven en memoria (`api/invitations/route.ts`) y eso **no sirve** para órdenes: varias instancias serverless, reintentos durante 24 h, conciliación. Hace falta una base de datos (Postgres/Supabase o KV) con una tabla `ramp_orders` (`order_id`, `local_id`, `address`, `status`, `amount_usd`, `tx_base`, `tx_arc`, `fund_id`, `created_at`, `raw`). **Decisión del equipo.**

**Contratos (solo Plan B):** `contracts/`: `RampForwarderFactory` + `RampForwarder` en Base (CREATE2 por dirección de usuario; solo `depositForBurn` de CCTP hacia `mintRecipient` = usuario en Arc, dominio 26). Se agregan direcciones Base y Base Sepolia al deployment.

**UI:**
- `app/src/app/(tabs)/add/page.tsx`:
  - Hoy es **solo el faucet** y su comentario ya dice "production uses D1".
  - Propuesta: si `NEXT_PUBLIC_RAMP_PROVIDER === "swapped"` (o es mainnet), se muestra el flujo D1. Si no, sigue el faucet.
  - Arc testnet queda con el faucet.
- Pasar los mocks a componentes reales:
  - `components/mock/d1-pay-with.tsx` → `components/ramp/pay-with.tsx`, reutilizando `PayMethodTiles`, `AmountDisplay` y `Keypad`, con cotización real.
  - `d2-verify.tsx` → `components/ramp/verify-intro.tsx`.
  - Nuevo `components/ramp/swapped-sheet.tsx` (iframe en sheet o diálogo, con fallback a pantalla completa).
  - Nueva `app/src/app/(tabs)/add/done/page.tsx`.
  - `d4-withdraw.tsx` detrás de un flag.
- `lib/copy.ts`:
  - Corregir `payWith.youPay` ("no fees").
  - Agregar textos de estado ("Procesando tu pago", "Llegando a tu cuenta"…).
  - Mencionar el código por email y el número fiscal en `verify.steps`.
  - **Nunca "USDC", "KYC" ni "wallet"**: el widget de Swapped probablemente sí los muestre (ver §6).
- Actividad: listar las órdenes de entrada ("Agregaste $100 · en camino").
- Headers: hoy no hay CSP en `next.config.mjs`. Si se agrega, permitir `frame-src https://widget.swapped.com https://sandbox.swapped.com`.

**Variables de entorno** (nombres propuestos):

| Variable | Valor |
|---|---|
| `SWAPPED_PUBLIC_KEY` | `pk_sandbox_…` / `pk_live_…` |
| `SWAPPED_SECRET_KEY` | `sk_…` (solo servidor; firma URLs y verifica webhooks) |
| `SWAPPED_WIDGET_URL` | `https://sandbox.swapped.com` o `https://widget.swapped.com` |
| `SWAPPED_API_URL` | `https://widget.swapped.com/api/v1/merchant` (la URL de sandbox está **sin documentar**) |
| `SWAPPED_CURRENCY_CODE` | `USDC_BASE` (Plan B) / código de Arc (Plan A) |
| `SWAPPED_MARKUP` | `0` (o el % acordado) |
| `NEXT_PUBLIC_RAMP_PROVIDER` | `swapped` / `faucet` |
| `APP_BASE_URL` | Para armar `responseUrl` y `redirectUrl` |
| `DATABASE_URL` (o KV) | Órdenes |
| `BASE_RPC_URL`, `RAMP_RELAYER_PRIVATE_KEY`, `CCTP_ATTESTATION_API` | Solo Plan B (relayer con ETH en Base; la API de atestación de Circle según la red) |
| `RAMP_CRON_SECRET` | Proteger reconcile y bridge |

---

## 5) Qué tiene que hacer el equipo

1. **Contactar a Swapped (partners o ventas)** para el alta de merchant. El onboarding no está documentado. Pedir claves `pk_live`/`sk_live` y acceso al dashboard con roles.
2. **Hacer las preguntas de §6**, sobre todo: Arc, white-label/textos, Apple Pay en iframe, pagos locales en LatAm y si aceptan un contrato (forwarder) como destino.
3. **Configurar el dashboard:**
   - Webhook global de respaldo (`/api/ramp/swapped/webhook`).
   - Markup ("Settings › Affiliate Fee", solo el owner del workspace).
   - Preguntar si hay **allowlist de dominios** u orígenes para el iframe y la redirección (no está documentado).
4. **Dominios:** producción en HTTPS para `responseUrl`/`redirectUrl` y un dominio de staging para sandbox.
5. **Compliance y legal:**
   - Revisar el contrato de merchant (quién es merchant of record en LatAm: **[sin verificar]**; ¿Northstake ApS?).
   - Actualizar términos y privacidad mencionando al socio de pagos.
   - Consentimiento para compartir el email.
   - Política de reembolsos: según la FAQ, el merchant tiene que devolver la cripto.
   - Restricción de Texas.
   - Confirmar que nuestro modelo (fondos gestionados por managers) no choca con las políticas de uso aceptable de Swapped.
6. **Migración a Arc mainnet** (requisito para dinero real), con presupuesto de gas y paymaster de Circle en mainnet.
7. **Plan B:** fondear un relayer con ETH en Base y revisar el contrato forwarder (seguridad).

---

## 6) Riesgos y preguntas abiertas para Swapped

**Riesgos**
- **Sin Arc:** el Plan B agrega un contrato, un relayer y minutos de espera. Si algo falla en el bridge, el dinero queda en Base (recuperable, pero hay soporte y conciliación).
- **Textos del widget:** casi seguro muestra "USDC", "Base", "dirección de wallet", "KYC" y la marca Swapped. Eso viola la regla de diseño. Mitigación parcial con el modo aggregator; el resto depende de white-label. **[preguntar a Swapped]**
- **"Sin comisiones" en D1 no es real:** el usuario paga entre ~2 % y 2,5 % con tarjeta o Apple Pay, más el spread. Opciones: Boats subsidia, o cambiamos el texto para mostrar el total real.
- **Pasos extra para el usuario:** login OTP en Swapped, verificación de identidad y número fiscal. Eso lo hace más largo que el mock.
- **Salida:** no es viable en AR, MX ni CL con Swapped hoy.
- **Sandbox limitado:** sin USDC y con máximo 15 EUR, no hay prueba de punta a punta antes de producción. Hay que planear un piloto con montos reales mínimos (7 EUR / 8 USD).
- **Reembolsos:** requieren que el merchant devuelva la cripto. Con el Plan B el dinero ya está en Arc o en el fondo del usuario, así que no está claro cómo se ejecutaría.
- **Revisión manual de hasta 30 min:** la UI de "en camino" tiene que tolerarla.
- **Argentina:** no hay ARS. El usuario paga en USD con tarjeta, lo que puede implicar recargos o percepciones del emisor local. **[sin verificar]**

**Preguntas para Swapped**
1. ¿Tienen planeado soportar **USDC en Arc mainnet**? ¿Fecha? ¿Y Arc testnet en sandbox?
2. ¿Hay **white-label** o personalización: logo, colores, tema oscuro, idioma (`lang`?) y textos sin "USDC/wallet/KYC"? ¿Podemos usar el modo **Aggregator Partners**?
3. ¿Funciona **Apple Pay dentro del iframe** en Safari iOS/macOS y en una PWA? ¿Recomiendan abrirlo top-level?
4. ¿Aceptan un **contrato** (forwarder CREATE2 no desplegado todavía) como `walletAddress`? ¿Hay controles de wallet propia o travel rule?
5. ¿Hay **eventos `postMessage`** en el widget de compra (orden creada o completada)?
6. ¿Cuál es la **URL de la API REST en sandbox**? ¿Hay USDC de testnet en sandbox?
7. ¿Exponen el **estado de verificación** de un cliente (por email o `externalCustomerId`) para saber si mostrar D2?
8. ¿Qué **límites** por operación, día y mes hay por nivel de verificación en AR, MX y CL?
9. **Salida en LatAm:** ¿hoja de ruta para SPEI (MX), CBU/CVU (AR), transferencia CLP (CL) o pago a tarjeta? ¿Acreditan depósitos que llegan por un mint de CCTP? ¿Qué tolerancia de monto aceptan?
10. **Comercial:** ¿comisiones para el merchant, mínimo de volumen, reparto del markup, quién es merchant of record en LatAm, términos sobre nuestro caso de uso (fondos gestionados)?
11. ¿Hay **allowlist de dominios** para iframe, redirect y webhook? ¿IPs fijas de los webhooks?
12. Reembolsos: ¿cómo operan si los fondos ya fueron reenviados a Arc?

---

## 7) Estimación por fases (1 dev full-stack; días hábiles, orientativos)

| Fase | Alcance | Estimación |
|---|---|---|
| **F0 · Descubrimiento** | Llamada con Swapped, respuestas a §6, alta de merchant, decidir Plan A o B y la base de datos | 2–5 días (depende de Swapped) |
| **F1 · Spike en sandbox** | `lib/server/swapped.ts`, `/api/ramp/session`, `/api/ramp/swapped/webhook`, tabla de órdenes, iframe en un sheet, compra de ETH Sepolia con la tarjeta de prueba, idempotencia y reintentos | 3–4 días |
| **F2a · Entrada, Plan A** (si Swapped soporta Arc) | URL con el código de Arc, "credited" por saldo, refresh | 2 días |
| **F2b · Entrada, Plan B** | Contrato forwarder + tests, relayer, integración CCTP Base → Arc con Forwarding Service, prueba Base Sepolia → Arc Testnet, estados de bridge | 6–9 días (+ revisión de seguridad del contrato) |
| **F3 · UX D1–D3 en producción** | Cotización real en D1, D2 condicional, pantalla "en camino", Actividad, copy, fallback a pantalla completa para Apple Pay, cron de conciliación, logs y alertas | 4–5 días |
| **F4 · Piloto con dinero real** | Arc mainnet (prerrequisito, aparte), compras mínimas en AR, MX y CL con tarjeta, Apple Pay y SPEI, ajustes | 2–3 días + migración a mainnet |
| **F5 · Salida (D4)** | Bloqueada hasta que haya pagos locales. Una vez disponible: `/sell` con `userSendsFunds=false`, burn CCTP Arc → Base a la dirección de Swapped, estados | 5–8 días |

**Total para entrada en producción:** ~11–16 días con el Plan A, o ~16–23 con el Plan B. No incluye la migración a Arc mainnet ni la salida.
