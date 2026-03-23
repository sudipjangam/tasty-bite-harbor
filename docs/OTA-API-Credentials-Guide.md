# 🔑 OTA API Credentials Guide — How to Get API Access from Each OTA

> **For Hotel Owners & Property Managers**
> This guide explains exactly how to obtain API/Connectivity credentials from each OTA so your Channel Management System can sync live data.

---

## Table of Contents

1. [Understanding the Two Types of Access](#understanding-the-two-types-of-access)
2. [MakeMyTrip & Goibibo (InGo-MMT)](#makemytrip--goibibo-ingo-mmt)
3. [Booking.com](#bookingcom)
4. [Agoda](#agoda)
5. [Expedia](#expedia)
6. [Difficulty Comparison Chart](#difficulty-comparison-chart)
7. [Precautions & Best Practices](#precautions--best-practices)
8. [Alternative: Using an Existing Channel Manager](#alternative-using-an-existing-channel-manager)
9. [Checklist Before Going Live](#checklist-before-going-live)

---

## Understanding the Two Types of Access

There are **two completely different** types of access to OTAs:

| Type | What It Is | Who Gets It | API Access? |
|------|-----------|-------------|-------------|
| **Extranet Login** | Web dashboard to manage your listing (rates, photos, bookings) | Any hotel owner who lists on the OTA | ❌ No |
| **Connectivity/API Credentials** | Programmatic access to push rates, pull bookings via code | Certified channel managers / tech partners | ✅ Yes |

> [!IMPORTANT]
> **Your regular extranet username/password will NOT work for API integration.** You need separate API credentials obtained through a partner certification process.

### Can a Hotel Owner Get API Access Directly?

**Short answer: It depends on the OTA.**

- **MakeMyTrip/Goibibo** — Yes, possible if you register as a connectivity partner
- **Booking.com** — No, individual hotels cannot connect directly; you must go through a certified channel manager
- **Agoda** — No, API access is only for certified connectivity partners
- **Expedia** — Difficult for small properties; they vet heavily based on volume

### The Easiest Path for a Single Hotel

If you own a single hotel and want live OTA data, the **most practical approach** is:
1. Use your CMS with its built-in adapters
2. Register as a **technology/connectivity partner** with each OTA (see steps below)
3. OR connect through an **existing certified channel manager** that exposes an API

---

## MakeMyTrip & Goibibo (InGo-MMT)

MakeMyTrip and Goibibo share the same backend platform called **InGo-MMT**. One set of credentials works for both.

### Difficulty: 🟡 Medium

### What You Need

| Item | Details |
|------|---------|
| **Portal** | [connect.makemytrip.com](https://connect.makemytrip.com) |
| **Program** | InGo-MMT Connectivity Partner Program |
| **Credentials You'll Get** | Partner ID, API Key, username, password (for authentication endpoint) |
| **Auth Type** | Bearer Token (via login API) or Session-based |
| **Cost** | Free to register; commission-based model |
| **Timeline** | 2-4 weeks for approval + 2-4 weeks for certification |

### Step-by-Step Process

#### Step 1: Register on Connect Portal
1. Go to **[connect.makemytrip.com](https://connect.makemytrip.com)**
2. Click **"Register as Technology Partner"** or **"Partner Registration"**
3. Fill in:
   - Company name (your hotel/software business name)
   - Contact person name and email
   - Phone number
   - Company type: Select **"Channel Manager"** or **"PMS Provider"**
   - Number of properties you manage (even if it's just 1)

#### Step 2: Submit Business Documents
- **GST Registration Certificate** (if applicable)
- **PAN Card** (company or individual)
- **Company Registration** (if you have a registered business)
- **Bank Account Details** (for payment settlement)
- **Property details** — List of properties you want to connect

#### Step 3: Technical Review
- MakeMyTrip team will review your application
- They may schedule a **call or meeting** to understand your tech setup
- Be prepared to demonstrate that your software can:
  - Push rates and availability
  - Pull and confirm reservations
  - Handle modifications and cancellations

#### Step 4: Receive API Credentials
Once approved, you'll receive:
```
Partner ID: MMT_XXXXX
API Key: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
API Base URL: https://api.ingo-mmt.com/v2/
Username: your_partner_username
Password: your_partner_password
```

#### Step 5: API Certification
- MakeMyTrip requires you to pass **certification tests** before going live
- Tests verify correct implementation of:
  - Rate push (single and bulk)
  - Availability update
  - Reservation pull
  - Cancellation handling
- **Certification typically takes 1-2 weeks**

#### Step 6: Go Live
- Once certified, your property goes live with API integration
- Your CMS can now push/pull data automatically

### MakeMyTrip Contact for Partner Queries
- **Email**: connectivity@makemytrip.com or partnersupport@makemytrip.com
- **Phone**: Check the partner portal for latest numbers
- **Help**: Inside Connect portal → Support section

---

## Booking.com

Booking.com has the **strictest** partner program among all OTAs.

### Difficulty: 🔴 Hard

### What You Need

| Item | Details |
|------|---------|
| **Portal** | [connect.booking.com](https://connect.booking.com) |
| **Program** | Connectivity Partner Program |
| **Credentials You'll Get** | Username, Password (HTTP Basic Auth) |
| **Auth Type** | HTTP Basic Authentication |
| **API Format** | OTA XML (v2003B) and B.XML (proprietary) |
| **Cost** | Free registration; model is commission-based |
| **Timeline** | 3-6 months (application + certification + go-live) |

### Important Note

> [!CAUTION]
> **Booking.com has temporarily paused new connectivity partner registrations** (as of late 2025) while they update their terms and conditions. Check [connect.booking.com](https://connect.booking.com) for the latest status.

### Requirements to Qualify

Booking.com has strict requirements. You must demonstrate:

1. **PCI Compliance** — Your system must be PCI-DSS compliant for handling payment data
2. **PII Compliance** — Proper handling of personally identifiable information
3. **Cloud-Based System** — Your software must be cloud/server-based (not desktop-only)
4. **Minimum Properties** — Generally need 50+ connected properties (varies by market)
5. **Technical Capability** — Must support ALL of their API functions:
   - Price and availability management
   - Real-time reservation management
   - Instant booking confirmation
   - Property content management
   - 1 year of rates/availability loaded at all times

### Step-by-Step Process

#### Step 1: Apply at Connectivity Portal
1. Go to **[connect.booking.com](https://connect.booking.com)**
2. Click **"Apply to become a partner"**
3. Fill in business details, technical capabilities, and property count
4. Submit application

#### Step 2: Business Vetting
- Booking.com team reviews your application
- They evaluate:
  - Company size and reputation
  - Technical maturity of your software
  - Number of properties you can bring
  - Market/region you operate in
- **This can take 4-8 weeks**

#### Step 3: Contract & Legal
- Sign the Connectivity Partner Agreement
- Agree to performance SLAs:
  - Reservation API fallback rate < 5% per month
  - Rates & Availability error rate < 10% per month

#### Step 4: Technical Integration
- Receive sandbox API credentials
- Implement using OTA XML (v2003B) schema
- Their API docs are available at: `connect.booking.com/documentation`

#### Step 5: Certification
- Three phases:
  1. **Basic Certification** — Core ARI + Reservation handling
  2. **Content Certification** — Property content management
  3. **Advanced Certification** — Promotions, policies, photos
- Each phase has test cases that must pass at 100%

#### Step 6: Go Live
- Once all certifications pass, you get production credentials
- Connect your properties via the Booking.com extranet → Account → Channel Manager

### Booking.com Contact
- **Portal**: [connect.booking.com](https://connect.booking.com)
- **Email**: connectivity@booking.com
- **Docs**: Available after partner registration

### Workaround for Small Hotels

Since Booking.com requires 50+ properties, a single hotel owner has two options:
1. **Use an existing certified channel manager** (like SiteMinder, ChannelRex, RateGain) and connect your CMS to their API
2. **Partner with other hotels** in your area to collectively apply as a connectivity partner

---

## Agoda

Agoda (part of Booking Holdings) has a **developer-friendly** connectivity program.

### Difficulty: 🟡 Medium

### What You Need

| Item | Details |
|------|---------|
| **Portal** | [agodaconnectivity.com](https://agodaconnectivity.com) |
| **System** | YCS (Yield Control System) APIs |
| **Credentials You'll Get** | Partner Key, Site ID, API credentials |
| **Auth Type** | API Key / Token-based |
| **Cost** | Free; commission model |
| **Timeline** | 2-6 weeks |

### Step-by-Step Process

#### Step 1: Register as Connectivity Partner
1. Go to **[agodaconnectivity.com](https://agodaconnectivity.com)**
2. Click **"Become a Connectivity Partner"**
3. Fill in:
   - Company information
   - Technology type (Channel Manager / PMS)
   - Number of properties
   - Technical contact details

#### Step 2: API Documentation Review
- Once registered, you get access to Agoda's API documentation
- Four API categories:
  - **YCS API** — Core ARI management
  - **OTA API** — Reservations and booking management
  - **Content Push API** — Property/room content updates
  - **Promotion API** — Deal management

#### Step 3: Development & Integration
- Build your integration using the provided docs
- Use the **sandbox environment** for testing
- Key endpoints:
  - ARI updates (multi-occupancy rates, restrictions)
  - Booking retrieval (by property or for all connected properties)
  - Product/content management

#### Step 4: Certification
- Submit your integration for review
- Agoda's team validates:
  - Correct ARI data flow
  - Booking retrieval accuracy
  - Error handling and retry logic

#### Step 5: Go Live
- Receive production credentials
- Hotels connect via YCS account → Rates & Availability → Connectivity Settings
- Select your channel manager from the dropdown

### Agoda Contact
- **Portal**: [agodaconnectivity.com](https://agodaconnectivity.com)
- **Docs**: [agoda.com/connectivity-api-docs](https://agoda.com/connectivity-api-docs)
- **Email**: connectivity@agoda.com

---

## Expedia

Expedia Group has the **most enterprise-focused** partner program.

### Difficulty: 🔴 Hard (for small hotels)

### What You Need

| Item | Details |
|------|---------|
| **Portal** | [expediapartnersolutions.com](https://www.expediapartnersolutions.com) |
| **API** | Rapid API (formerly EAN API) |
| **Credentials You'll Get** | API Key + Shared Secret |
| **Auth Type** | HMAC SHA-512 signature |
| **Cost** | No fixed fee; commercial terms vary by volume |
| **Timeline** | 2-6 months |

### Requirements

Expedia Group **carefully vets** every applicant. They evaluate:
- Annual revenue and growth potential
- Website traffic and booking volumes
- Existing technology solutions
- Business model (B2B vs B2C)

> [!WARNING]
> **Small startups and single-property owners are typically directed to affiliate programs rather than direct API access.** You need significant volume to justify direct integration.

### Step-by-Step Process

#### Step 1: Express Interest
1. Go to **[expediapartnersolutions.com](https://www.expediapartnersolutions.com)**
2. Click **"Contact Us"** or **"Become a Partner"**
3. Fill in business details and integration requirements
4. Specify that you need **Rapid API** access for hotel connectivity

#### Step 2: Business Review
- Expedia will evaluate your application
- They may request:
  - Revenue figures
  - Traffic data
  - Existing client/property count
  - Technical architecture overview

#### Step 3: Contract & Commercials
- If approved, negotiate commercial terms
- Pricing depends on:
  - Transaction volume
  - Content/services required
  - Support level needed

#### Step 4: Obtain API Credentials
1. Log into the **Expedia Partner Portal**
2. Navigate to: **Connectivity → API Key**
3. Receive:
   - API Key (for development/testing initially)
   - Shared Secret (for HMAC authentication)

#### Step 5: Integration & Compliance
- Implement the Rapid API
- Meet launch requirements:
  - PCI compliance
  - SSL encryption
  - Correct tax/fee display
  - TripAdvisor content usage rules
- **Your integration starts in restricted development mode**

#### Step 6: Production Review & Go-Live
- Expedia reviews your booking product
- Verifies compliance with all requirements
- Approves your API key for production use

### Expedia Contact
- **Portal**: [expediapartnersolutions.com](https://www.expediapartnersolutions.com)
- **Docs**: Available after partner approval
- **Email**: Provided during onboarding

---

## Difficulty Comparison Chart

| OTA | Difficulty | Min Properties | Timeline | API Type | Individual Hotel Owner? |
|-----|-----------|---------------|----------|----------|------------------------|
| **MakeMyTrip** | 🟡 Medium | 1+ | 3-6 weeks | REST JSON | ✅ Yes, with tech demo |
| **Goibibo** | 🟡 Medium | 1+ | 3-6 weeks | REST JSON (same as MMT) | ✅ Yes |
| **Booking.com** | 🔴 Hard | 50+ | 3-6 months | OTA XML | ❌ Need certified CM |
| **Agoda** | 🟡 Medium | 5+ | 2-6 weeks | REST + XML | ⚠️ Possible with tech setup |
| **Expedia** | 🔴 Hard | Volume-based | 2-6 months | HMAC REST | ❌ Need significant volume |

### Best Strategy for a Single Hotel

```
Priority 1: MakeMyTrip + Goibibo (1 registration gets both)
Priority 2: Agoda (relatively accessible)  
Priority 3: Booking.com (through certified partner or wait for program reopening)
Priority 4: Expedia (only if you have high booking volume)
```

---

## Precautions & Best Practices

### Security

> [!CAUTION]
> **Never share API credentials over email or WhatsApp.** Use encrypted channels only.

1. **Store credentials securely** — Our CMS encrypts all credentials at rest in Supabase
2. **Rotate API keys regularly** — Change passwords every 90 days
3. **Use separate credentials for test/production** — Never test with production keys
4. **Enable webhook secrets** — Set up webhook validation tokens for each OTA
5. **Monitor API usage** — Watch for unusual patterns in sync logs

### Legal & Compliance

1. **Read the partner agreement carefully** before signing
2. **Understand commission structures** — Each OTA takes different commission (15-25%)
3. **Rate parity clauses** — Some OTAs require you maintain the same rate across all channels
4. **Cancellation policies** — Ensure your policies are consistent across OTAs
5. **Data protection** — Guest data from OTAs is subject to GDPR/privacy laws; don't share it
6. **PCI compliance** — If you handle payment data from OTAs, ensure PCI-DSS compliance

### Operational

1. **Start with one OTA** — Don't try to connect all at once; start with MakeMyTrip
2. **Test thoroughly in sandbox** — Use test/staging environments before going live
3. **Set up rate parity monitoring** — Our CMS has this built in
4. **Configure buffer inventory** — Keep 1-2 rooms as buffer to prevent overbooking
5. **Monitor sync logs daily** — Check for failed syncs and resolve promptly
6. **Keep extranet access** — Always maintain manual extranet access as a backup

### Common Mistakes to Avoid

| Mistake | Why It's Bad | Prevention |
|---------|-------------|------------|
| Using extranet credentials for API | Won't work; different auth system | Apply for API credentials separately |
| Pushing wrong rates to OTAs | Revenue loss or rate parity violations | Test with sandbox first |
| Not handling cancellations | Ghost bookings, overbooking | Ensure cancellation webhook works |
| Ignoring rate parity | OTA penalties, lower ranking | Use Rate Parity Dashboard |
| No retry logic for failed syncs | Stale data on OTAs | Our CMS has retry queue built in |

---

## Alternative: Using an Existing Channel Manager

If getting direct API access is too complex, you can connect through an **existing certified channel manager** that provides an API:

| Channel Manager | API Available? | Properties | Pricing |
|----------------|---------------|------------|---------|
| **SiteMinder** | ✅ Yes | 35,000+ | From ₹5,000/month |
| **RateGain** | ✅ Yes | 30,000+ | Custom pricing |
| **AxisRooms** | ✅ Yes | Indian market focused | From ₹3,000/month |
| **eZee** | ✅ Yes | 20,000+ | From ₹2,500/month |
| **Djubo** | ✅ Yes | Indian market focused | From ₹2,000/month |

**How this works:**
1. Subscribe to an existing channel manager
2. They already have API credentials for all major OTAs
3. Connect our CMS to their API instead of directly to OTAs
4. You get live data without the certification hassle

> [!TIP]
> **Recommended for properties with <10 rooms:** Using an existing channel manager is faster and cheaper than getting direct API access from each OTA individually.

---

## Checklist Before Going Live

- [ ] **MakeMyTrip/Goibibo**: Applied at connect.makemytrip.com
- [ ] **MakeMyTrip/Goibibo**: Received Partner ID and API Key
- [ ] **MakeMyTrip/Goibibo**: Passed certification tests
- [ ] **Booking.com**: Applied at connect.booking.com (if registrations open)
- [ ] **Booking.com**: OR connected through certified channel manager
- [ ] **Agoda**: Registered at agodaconnectivity.com
- [ ] **Agoda**: Completed YCS API certification
- [ ] **Credentials stored in CMS**: OTA Connect tab → each OTA configured
- [ ] **Rooms mapped**: Mapping tab → all rooms linked to OTA room type IDs
- [ ] **Test sync completed**: At least one successful push/pull cycle
- [ ] **Rate parity verified**: Rate Parity tab shows reasonable results
- [ ] **Webhook URLs configured**: OTA extranet → webhook URLs point to your ota-webhooks function
- [ ] **Buffer inventory set**: Pool Inventory → buffer of 1-2 rooms per type
- [ ] **Monitoring active**: Sync logs reviewed, no persistent errors

---

> **Need Help?** Contact the MakeMyTrip/Goibibo partner team first — they're the most accessible for Indian hoteliers and one registration covers two major OTAs.

*Last Updated: March 2026*
