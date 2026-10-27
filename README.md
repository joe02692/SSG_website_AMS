<div align="center">

<img src="public/elsalam-logo.png" alt="El-Salam Scouting Group" width="220" />

<h1>El-Salam Scouting Group · مجموعة السلام الكشفية</h1>

<p>
  <strong>Official Public Portal &amp; Association Management System (AMS)</strong><br />
  <em>Character, Service &amp; Friendship · Since 1977</em>
</p>

<p>
  <a href="https://ssg-website-ams.vercel.app">
    <img src="https://img.shields.io/badge/Live_Platform-ssg--website--ams.vercel.app-15803d?style=for-the-badge" alt="Live Platform" />
  </a>
  <img src="https://img.shields.io/badge/Languages-Arabic_(RTL)_%26_English_(LTR)-116631?style=for-the-badge" alt="Bilingual Arabic and English" />
  <img src="https://img.shields.io/badge/Branches-Tanta_%C2%B7_Al_Rehab_%C2%B7_Madinaty-1e293b?style=for-the-badge" alt="Branches" />
</p>

</div>

---

## Executive Overview

The **El-Salam Scouting Group Platform** unifies the group's public identity and its internal operations into one bilingual (**Arabic & English**) digital system. It serves two core purposes:

1. **Public Portal** — Introduces visitors and families to El-Salam's heritage since 1977, its three branches (*Tanta, Al Rehab, and Madinaty*), the Scout Promise and Law, the eight age stages, upcoming group events, and a curated camp photo archive.
2. **Association Management System (AMS)** — Provides a secure, role-based workspace where scouts register, parents manage their children's memberships, stage leaders access seasonal plans, and administrators oversee rosters, identity documents, and leadership approvals.

---

## 1. User Hierarchy & Role Map

Every person interacting with the platform follows a structured progression—starting as a **Guest**, joining as a **Scout** or **Parent**, or applying for leadership and being approved into one of the **four Leader Roles**.

```mermaid
flowchart TB
    Guest["<b>1. Guest / Visitor</b><br/>Explores public pages, history, stages,<br/>camp gallery & live event countdown"]

    Guest -->|Creates Account| MemberTrack["<b>Member & Family Track</b>"]
    Guest -->|Submits Leader Request| Pending["<b>Pending Leader</b><br/>Selects requested position & waits<br/>in approval queue (no system access)"]

    subgraph Family["Scouts & Parents"]
        Scout["<b>2A. Scout</b><br/>• Completes personal profile<br/>• Uploads birth certificate<br/>• Receives 6-digit Parent Code"]
        Parent["<b>2B. Parent / Guardian</b><br/>• Registers young children directly<br/>• Or links to an existing Scout<br/>  using their Parent Code"]
        Parent -.->|Manages & Follows| Scout
    end

    MemberTrack --> Scout
    MemberTrack --> Parent

    Pending -->|Approved & Assigned by<br/>Head Site Admin| LeaderTrack["<b>3. Approved Leadership (4 Leader Types)</b>"]

    subgraph Leaders["The Four Leader Types"]
        L1["<b>Type 1 · Stage Leader</b><br/>• Runs stage sessions & activities<br/>• Serves on work committees<br/>• Views stage roster & seasonal plans"]
        L2["<b>Type 2 · Stage Admin</b><br/>• Oversees an assigned stage (max 2)<br/>• Uploads, updates & archives<br/>  the stage's Seasonal Plan"]
        L3["<b>Type 3 · Site Admin</b><br/>• Views full Scout & Leader rosters<br/>• Inspects identity documents<br/>• Exports spreadsheets & document ZIPs"]
        L4["<b>Type 4 · Head Site Admin</b><br/>• Approves or declines leader requests<br/>• Assigns leader roles & stage admins<br/>• Configures public Event Countdown<br/>• Generates recovery links & manages members"]

        L1 --> L2 --> L3 --> L4
    end

    LeaderTrack --> L1
    LeaderTrack --> L2
    LeaderTrack --> L3
    LeaderTrack --> L4
```

### Role Capabilities Summary

| User Tier | Role | How They Join | Key Responsibilities & Access |
| :--- | :--- | :--- | :--- |
| **Visitor** | **Guest** | Open access | Browses the homepage, history timeline, 8 scouting stages, camp photo albums, and live event countdown in Arabic or English. |
| **Member** | **Scout** | Self-registration | Completes scout onboarding (date of birth, stage, contact details, birth certificate) and receives a unique **Parent Code**. |
| **Family** | **Parent / Guardian** | Self-registration | Registers children who do not have their own accounts, or links to an existing Scout account via their **Parent Code**. |
| **Applicant** | **Pending Leader** | Leader signup request | Chooses a requested position and waits in a restricted holding state until reviewed by the Head Site Admin. |
| **Leader (1/4)** | **Stage Leader** | Approved by Head Admin | Completes leader profile (national ID, university/graduate details, stages served, committees) and accesses stage tools & seasonal plans. |
| **Leader (2/4)** | **Stage Admin** | Assigned by Head Admin | Manages a specific scouting stage (up to 2 Stage Admins per stage) and uploads/replaces that stage's **Seasonal Plan** workbook. |
| **Leader (3/4)** | **Site Admin** | Assigned by Head Admin | Accesses the full organization directory, verifies birth certificates and ID cards, and exports member data and bulk document archives. |
| **Leader (4/4)** | **Head Site Admin** | Root Administrator | Governs the entire system: approves leader requests, assigns all roles, sets the public Event Countdown, and manages member lifecycle. |

---

## 2. How the Site Works — End-to-End Platform Map

The platform is divided into a **Public Experience** for visitors and a **Protected Workspace** that adapts dynamically to the signed-in user's role.

```mermaid
flowchart LR
    subgraph Public["Public Portal (Open to All)"]
        Home["<b>Homepage</b><br/>Hero Slideshow · Scout Promise & Law<br/>Live Event Countdown · Contact"]
        History["<b>Our History</b><br/>1977–2026 Timeline &<br/>16 Camp Albums"]
        Stages["<b>Our Stages</b><br/>Guide to all 8<br/>Scouting Age Groups"]
        Gallery["<b>Camp Gallery</b><br/>Curated Photo Albums<br/>from Trips & Camps"]
    end

    subgraph AuthGate["Access & Verification"]
        Auth["<b>Sign Up / Sign In</b><br/>Choose Path:<br/>Scout · Parent · Leader"]
        Verify["<b>Role & Profile Check</b><br/>1. Is leader approved?<br/>2. Is onboarding complete?"]
    end

    subgraph Workspace["Internal AMS Workspace (Role-Based)"]
        ScoutDash["<b>Scout Dashboard</b><br/>Personal Record · Document<br/>Parent Linking Code"]
        ParentDash["<b>Parent Dashboard</b><br/>Add Child · Link via Code<br/>Manage Children's Records"]
        StageHub["<b>Leadership Stage Hub</b><br/>Stage Overview &<br/>Seasonal Plan Viewer / Editor"]
        AdminConsole["<b>Admin Console</b><br/>Leader Approvals · Full Rosters<br/>Document Inspection · Exports<br/>Homepage Countdown Settings"]
    end

    Public --> Auth --> Verify
    Verify -->|Scout| ScoutDash
    Verify -->|Parent| ParentDash
    Verify -->|Stage Leader / Stage Admin| StageHub
    Verify -->|Site Admin / Head Site Admin| AdminConsole
```

---

## 3. Core Workflows

### A. Onboarding & Leadership Approval Flow

Unlike scouts and parents—who can complete onboarding immediately after creating an account—anyone applying as a **Leader** is placed in a protective holding state until verified by the **Head Site Admin**.

```mermaid
sequenceDiagram
    actor User as Applicant
    participant Portal as AMS Platform
    actor HeadAdmin as Head Site Admin

    alt Joining as Scout or Parent
        User->>Portal: Signs up as Scout or Parent
        Portal->>User: Opens role-specific Onboarding Form
        User->>Portal: Submits details & uploads document
        Portal->>User: Grants immediate access to Dashboard
    else Joining as Leader
        User->>Portal: Signs up & requests position (Stage Leader / Stage Admin / Site Admin)
        Portal->>User: Places account in "Pending Approval" waiting room
        Portal->>HeadAdmin: Sends email notification of new Leader Request
        HeadAdmin->>Portal: Reviews applicant & assigns official Leader Role
        Portal->>User: Unlocks Leader Onboarding Form (ID card, university, stages, committees)
        User->>Portal: Completes Leader Onboarding
        Portal->>User: Grants access to Leader / Admin Workspace
    end
```

---

### B. Parent & Child Guardianship Workflow

Parents can manage all of their children in the group from a single guardian account using two flexible methods:

```mermaid
flowchart TD
    Parent["<b>Signed-in Parent / Guardian</b>"]

    Parent --> MethodA["<b>Option A · Register a Young Child Directly</b><br/>For children without their own email or login"]
    Parent --> MethodB["<b>Option B · Link an Existing Scout Account</b><br/>For older scouts who already signed up themselves"]

    MethodA --> Form["Parent fills in child's details, stage &<br/>uploads child's birth certificate"]
    Form --> Linked["<b>Unified Family Dashboard</b><br/>Parent can view and update records & documents<br/>for all linked children in one place"]

    MethodB --> Code["Scout shares their 6-character <b>Parent Code</b><br/>from their Scout Dashboard"]
    Code --> EnterCode["Parent enters the code on their dashboard"]
    EnterCode --> Linked
```

---

### C. Seasonal Plans & Document Archiving Workflow

To protect organizational records, the platform follows a **zero-data-loss policy**. Identity documents and seasonal plan spreadsheets are organized into structured folders and preserved automatically whenever changes occur.

```mermaid
flowchart LR
    subgraph Docs["Member Identity Documents"]
        UploadDoc["Scout Birth Certificate<br/>or Leader ID Card"] --> FileDoc["<b>Active Filing Cabinet</b><br/>Filed by Stage (Scouts)<br/>or Gender (Leaders)"]
        FileDoc -->|If Member Leaves| FormerDoc["<b>Former Members Archive</b><br/>Dated & preserved permanently"]
    end

    subgraph Plans["Stage Seasonal Plans"]
        UploadPlan["Stage Admin or Head Admin<br/>Uploads Excel Plan"] --> ActivePlan["<b>Live Seasonal Plan</b><br/>Viewable in-browser by all<br/>Leaders across all 8 stages"]
        ActivePlan -->|When Replaced or Removed| ArchivePlan["<b>Timestamped Plan Archive</b><br/>Previous versions remain<br/>accessible to leaders"]
    end
```

---

## 4. Organizational Structure Map

El-Salam Scouting Group operates across **3 branches**, organizes members into **8 age-appropriate scouting stages**, and coordinates leadership through **5 specialized work committees**.

```mermaid
flowchart TB
    Group["<b>El-Salam Scouting Group · مجموعة السلام الكشفية</b><br/>Founded 1977"]

    Group --> Branches["<b>3 Branches</b>"]
    Group --> Stages["<b>8 Scouting Stages</b>"]
    Group --> Committees["<b>5 Leader Work Committees</b>"]

    subgraph BranchList["Where We Meet"]
        B1["<b>Tanta Sports Club</b><br/>Tanta (Oldest Home · 1977)"]
        B2["<b>Al Rehab Sports Club</b><br/>Al Rehab (Opened 2010)"]
        B3["<b>Madinaty Sports Club</b><br/>Madinaty"]
    end

    subgraph StageList["Member Progression"]
        S1["1. Buds · البراعم"]
        S2["2. Blossoms · الزهرات"]
        S3["3. Cubs · الأشبال"]
        S4["4. Guides · المرشدات"]
        S5["5. Scouts · الكشافة"]
        S6["6. Senior Guides · المتقدمات"]
        S7["7. Senior Scouts · المتقدم"]
        S8["8. Rovers · الجوالة"]
    end

    subgraph CommitteeList["Leadership Operations"]
        C1["Program Committee"]
        C2["Media Committee"]
        C3["Secretary Committee"]
        C4["Tools & Logistics Committee"]
        C5["Training Committee"]
    end

    Branches --> BranchList
    Stages --> StageList
    Committees --> CommitteeList
```

---

<div align="center">

<h3>Connect with El-Salam Scouting Group</h3>

<p>
  <a href="https://ssg-website-ams.vercel.app"><strong>Official Website</strong></a>
  &nbsp;·&nbsp;
  <a href="https://ssg-website-ams.vercel.app/signup"><strong>Join the Group</strong></a>
  &nbsp;·&nbsp;
  <a href="https://ssg-website-ams.vercel.app/login"><strong>Member Sign In</strong></a>
  &nbsp;·&nbsp;
  <a href="https://www.instagram.com/ssg_elrehab_club"><strong>Instagram</strong></a>
  &nbsp;·&nbsp;
  <a href="https://www.facebook.com/share/1CAy5asLoZ/"><strong>Facebook</strong></a>
  &nbsp;·&nbsp;
  <a href="https://www.linkedin.com/company/elsalam-scout-groups/"><strong>LinkedIn</strong></a>
  &nbsp;·&nbsp;
  <a href="https://on.soundcloud.com/jM1XiXJjvlOwUbTR2j"><strong>SoundCloud</strong></a>
</p>

**مجموعات السلام الكشفية** · El-Salam Scout Groups  
<sub>Character, Service and Friendship · Since 1977</sub>

</div>
