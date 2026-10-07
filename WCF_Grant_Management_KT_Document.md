# Wadhwani Grants (WCF) Grant Management System
## Master Technical & Functional Knowledge Transfer (KT) Document

**Document Version**: 3.1 (Phase 1 Clean Architecture & Operational Reference)  
**Target Audience**: Salesforce Developers, Lead Architects, System Administrators, QA Engineers, and Product Owners  
**Application**: WCF Grant Management Platform (`WCF_Grant_Managment.app-meta.xml`)  
**Organization**: Wadhwani Charitable Foundation (WCF)  

---

## Table of Contents
1. [Executive Overview & Solution Architecture](#1-executive-overview--solution-architecture)
2. [Record Types & Persona Role-Based Access Control (RBAC)](#2-record-types--persona-role-based-access-control-rbac)
3. [End-to-End Lifecycle State Machine & Process Flow](#3-end-to-end-lifecycle-state-machine--process-flow)
4. [Deep-Dive Catalog of All 28 Lightning Web Components (LWC)](#4-deep-dive-catalog-of-all-28-lightning-web-components-lwc)
5. [Apex Classes, Services & Controllers Architecture](#5-apex-classes-services--controllers-architecture)
6. [Detailed Analysis of All 8 Core Salesforce Flows](#6-detailed-analysis-of-all-8-core-salesforce-flows)
7. [Apex Triggers & Handlers (Active Architecture Only)](#7-apex-triggers--handlers-active-architecture-only)
8. [Static Resources Catalog & Third-Party Client Libraries](#8-static-resources-catalog--third-party-client-libraries)
9. [Complete Data Model & Field Dictionary](#9-complete-data-model--field-dictionary)
   - [9.1. Standard Objects & Custom Fields](#91-standard-objects--custom-fields)
   - [9.2. Custom Objects & Child Data Entities](#92-custom-objects--child-data-entities)
   - [9.3. Custom Metadata Types (`__mdt`)](#93-custom-metadata-types-mdt)
10. [Email Templates & Notification Matrix (36+ Templates & In-Flow Text Templates)](#10-email-templates--notification-matrix-36-templates--in-flow-text-templates)
11. [Third-Party Integrations & External Systems](#11-third-party-integrations--external-systems)
    - [11.1. OpenStreetMap Nominatim Geocoding API](#111-openstreetmap-nominatim-geocoding-api)
    - [11.2. Einstein GenAI Automated Proposal Scoring](#112-einstein-genai-automated-proposal-scoring)
12. [Operations, Admin Guide & Troubleshooting Manual](#12-operations-admin-guide--troubleshooting-manual)

---

## 1. Executive Overview & Solution Architecture

The **WCF Grant Management System** is an enterprise Salesforce Experience Cloud and Lightning Platform solution purpose-built for the Wadhwani Charitable Foundation (WCF). It manages the intake across **3 funding tracks** (*Job Fulfillment*, *Job Creation*, *Livelihood Upliftment*), quantitative screening by Validators, multi-reviewer qualitative rubric scoring, Executive Grant Committee approval (Accept / Reject), and automated compliance onboarding for multi-year philanthropic grants.

---

---

## 2. Record Types & Persona Role-Based Access Control (RBAC)

The Phase 1 system enforces strict multi-persona security using **Person Account Flags** combined with **SObject Record Types** managed centrally via [`RecordTypeHelper.cls`](file:///c:/Users/WELCOME/Desktop/WG%20sandbox/WG%20Sandbox/force-app/main/default/classes/RecordTypeHelper.cls).

### 2.1. System Record Types Matrix (Phase 1 Active Implementation)

| SObject API Name | Record Type Developer Name | UI Label | Implementation Purpose & Workflow Role |
|---|---|---|---|
| **`IndividualApplication`** | `Wadhwani_Grants` | Wadhwani Grants | Primary proposal intake record type for all grant tracks. |
| **`ApplicationReview`** | `WCF_Validator` | WCF Validator | Stage 1: Quantitative screening and document verification review. |
| **`ApplicationReview`** | `WG_Reviewer` | WG Reviewer | Stage 2: Master qualitative proposal evaluation (7 categories, 22 criteria). |
| **`ApplicationDecision`** | `WG_Approver` | WG Approver | Stage 3: Executive Grant Committee deliberation & final sign-off. |

### 2.2. User Persona Matrix & Role Resolution

```
Logged-in User (UserInfo.getUserId())
      │
      ▼
Fetch Account via User.AccountId / ContactId
      │
      ├── Account.WCFs_Validator__c == true  ──► Validator Persona  (Access to /validator-portal)
      ├── Account.WCF_Reviewer__c   == true  ──► Reviewer Persona   (Access to /reviewer-portal)
      ├── Account.WCF_Approver__c   == true  ──► Approver Persona   (Access to /approver-portal)
      └── Default (Applicant)                ──► Applicant Persona  (Access to /wcf-dashboard)
```

Role verification is securely enforced on the server-side inside `WCFPortalUserController.assertRole(roleName)`. Unauthorized attempts throw an `AuraHandledException('Access denied: insufficient permissions for ' + roleName)`.

---

## 3. End-to-End Lifecycle State Machine & Process Flow

The grant lifecycle progresses through structured stages from intake through onboarding:

```
[1. DRAFT] ──(Applicant Submits)──► [2. SUBMITTED] ──► (Wadhwani Grants - Email: E-01/E-02)
                                          │
                                          ▼
                             [3. VALIDATOR SCREENING]
                                          │
                   ┌──────────────────────┼──────────────────────┐
                   │ (Decision: Return)   │ (Decision: Pass)     │ (Decision: Flag)
                   ▼                      ▼                      ▼
        [REVISION REQUESTED]      [UNDER REVIEW]          [FLAGGED / CLOSED]
                   │                      │
       (Applicant Resubmits)              ▼
                   │             [4. REVIEWER EVALUATION] (10-Day SLA)
                   └──────────────►       │
                                          ▼
                                 [REVIEW SUBMITTED] ──► (WCF Approver Email Alert Flow)
                                          │
                                          ▼
                              [5. APPROVER COMMITTEE]
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   │ (Decision: Accept)                          │ (Decision: Reject)
                   ▼                                             ▼
          [APPROVED FOR FUNDING]                         [NOT APPROVED]
                   │                                             │
                   ▼                                             ▼
        [6. COMPLIANCE ONBOARDING]                     (Email: Application_Decision_Declined)
   (WF Compliance Document flow: E-12)
                   │
  (All Mandatory Docs Validated via Trigger)
                   │
                   ▼
             [7. ONBOARDED]
```

---

## 4. Deep-Dive Catalog of All 28 Lightning Web Components (LWC)

Below is the complete analysis of all 28 Lightning Web Components:

### 1. `wcfApplicantDashboard`
- **Path**: `force-app/main/default/lwc/wcfApplicantDashboard/`
- **Apex Controller**: `WCFProposalListController.cls` (`getApplicantProposals`)
- **Key Functionality**:
  - Displays summary statistics cards: Total Applications, In Draft, Submitted, Revisions Needed, Approved.
  - Interactive data table showing Application Number, Track Name, Submission Date, Current Status, and Action CTA.
  - Dynamically routes applicant to `wcfDynamicForm` (for Draft / Revision Requested) or `wcfFormPreview` (for Submitted / Under Review).

### 2. `wcfApplicantWelcomeDashboard`
- **Path**: `force-app/main/default/lwc/wcfApplicantWelcomeDashboard/`
- **Key Functionality**:
  - Landing hero dashboard for newly registered or first-time applicants.
  - Displays grant tracks overview (*Job Fulfillment*, *Job Creation*, *Livelihood Upliftment*).
  - Contains eligibility trigger launching `wcfEligibilityModal` before opening application form.

### 3. `wcfApplicationFaqModal`
- **Path**: `force-app/main/default/lwc/wcfApplicationFaqModal/`
- **Apex Controller**: `wcfApplicationFaqController.cls`
- **Key Functionality**:
  - Searchable FAQ modal rendered across all portals.
  - Expandable accordion categorized by Eligibility, Financial Budgets, Multi-Year Metrics, and Compliance.

### 4. `wcfApplicationList`
- **Path**: `force-app/main/default/lwc/wcfApplicationList/`
- **Apex Controller**: `WCFProposalListController.cls`
- **Key Functionality**:
  - Staff / Program Manager dashboard listing all incoming applications.
  - Provides multi-column sorting, search by Organization Name / Application Number, and status filtering.

### 5. `wcfApplicationTimeline`
- **Path**: `force-app/main/default/lwc/wcfApplicationTimeline/`
- **Key Functionality**:
  - Visual stage chevron/stepper component embedded in applicant header.
  - Stages: `1. Draft` ➔ `2. Initial Screening` ➔ `3. Technical Review` ➔ `4. Decision` ➔ `5. Compliance & Onboarding`.
  - Reflects real-time state derived from `IndividualApplication.Status`.

### 6. `wcfApproverContainer`
- **Path**: `force-app/main/default/lwc/wcfApproverContainer/`
- **Apex Controller**: `WCFApproverListController.cls` (`saveDecision`, `revokeDecision`, `getExistingDecision`, `getApproverRejectionReasonOptions`)
- **Key Functionality**:
  - Executive deliberation workbench for Grant Approvers.
  - Split layout: Left pane embeds proposal preview (`wcfFormPreview`), Right pane displays reviewer evaluation scores (`wcfReviewerFormPreview`).
  - **Action Decisions**: Allows Approver to execute **only 2 decisions**:
    1. **Accept**: Records funding approval with mandatory decision context comments.
    2. **Reject**: Records decline with required comments and selectable structured rejection reason tiles.
  - Includes **Revoke Decision** capability within the allowable time window.

### 7. `wcfApproverListView`
- **Path**: `force-app/main/default/lwc/wcfApproverListView/`
- **Apex Controller**: `WCFApproverListController.cls` (`getApproverQueue`)
- **Key Functionality**:
  - Approver queue displaying proposals where reviewer evaluations are completed.
  - Shows organization name, track, aggregate scores, and reviewer recommendation pills.

### 8. `wcfComplianceDocs`
- **Path**: `force-app/main/default/lwc/wcfComplianceDocs/`
- **Apex Controller**: `WCFComplianceController.cls`
- **Key Functionality**:
  - Applicant compliance document upload interface for 80G, 12A, FCRA, Audited Financials, and Master MoU.
  - Integrates `lightning-file-upload` bound to `WCF_Compliance_Document__c`.
  - Displays real-time status badges: `Not Started`, `Draft Saved`, `Pending Review`, `Validated`, `Action Needed`.

### 9. `wcfComplianceDocuments`
- **Path**: `force-app/main/default/lwc/wcfComplianceDocuments/`
- **Apex Controller**: `ComplianceDocumentController.cls`
- **Key Functionality**:
  - Internal compliance verification console for Programme Leads.
  - Summary KPI tiles: *All Requests*, *Pending Review*, *Overdue*, *Received*.
  - Review drawer to inspect uploaded file previews and record verification decisions (**Validated**, **Returned with Notes**, **Rejected**).

### 10. `wcfDynamicForm`
- **Path**: `force-app/main/default/lwc/wcfDynamicForm/`
- **Apex Controller**: `WCFFormEngineController.cls`, `WCFFormMetadataController.cls`, `OpenStreetMapService.cls`
- **Static Resources**: `WIN_Logo`, `flagTelpicker`, `downloadjs`, `autotable`, `wcfFormFocusStyles`
- **Key Functionality**:
  - Universal metadata-driven RFI form engine rendering 28 dynamic questions across **3 tracks** (*Job Fulfillment*, *Job Creation*, *Livelihood Upliftment*).
  - Multi-year financial budget calculators and automatic balance checks.
  - Real-time draft auto-saving on field blur.
  - Multi-language switching (`en_US`, `es`, `pt_BR`, `hi`).
  - OpenStreetMap address autocomplete and international telephone flag selector.

### 11. `wcfEligibilityModal`
- **Path**: `force-app/main/default/lwc/wcfEligibilityModal/`
- **Key Functionality**:
  - Pre-application 5-point eligibility verification checklist modal.
  - Confirms non-profit legal status, FCRA registration, minimum operating history, and governance compliance.

### 12. `wcfFormPreview`
- **Path**: `force-app/main/default/lwc/wcfFormPreview/`
- **Apex Controller**: `WCFValidatorController.getWCFFullPreviewData`, `WCFValidatorController.getApplicationAttachments`
- **Static Resources**: `WIN_Logo`, `downloadjs`, `autotable`, `mammoth`, `xlsx`
- **Key Functionality**:
  - Read-only proposal preview rendering all 28 question responses, financial tables, and outcome projections.
  - Client-side document previewer for PDF, DOCX, XLSX, and PNG/JPG attachments.

### 13. `wcfHomeDashboard`
- **Path**: `force-app/main/default/lwc/wcfHomeDashboard/`
- **Apex Controller**: `WCFPortalUserController.cls`, `wcfHomeDashboardController.cls`
- **Key Functionality**:
  - Smart portal router that detects the user's role flags on their Person Account and redirects them to their respective workspace.

### 14. `wcfPortalHeader`
- **Path**: `force-app/main/default/lwc/wcfPortalHeader/`
- **Static Resource**: `wcfLogos`
- **Key Functionality**:
  - Global navigation header displaying WCF branding, active portal context, user avatar, notifications bell, and logout action.

### 15. `wcfPortalSidebar`
- **Path**: `force-app/main/default/lwc/wcfPortalSidebar/`
- **Key Functionality**:
  - Collapsible side navigation menu displaying role-specific navigation links (Dashboard, Applications, Review Queue, Compliance, Settings).

### 16. `wcfProposalListView`
- **Path**: `force-app/main/default/lwc/wcfProposalListView/`
- **Apex Controller**: `WCFProposalListController.cls`
- **Key Functionality**:
  - Reviewer proposal queue table displaying assigned applications, evaluation status, score completion, and remaining SLA days.

### 17. `wcfReturnBanner`
- **Path**: `force-app/main/default/lwc/wcfReturnBanner/`
- **Key Functionality**:
  - High-visibility banner displayed at the top of an application when returned by a Validator or Reviewer.
  - Renders consolidated feedback notes from `ApplicationReview.Consolidated_Return_Comments__c`.

### 18. `wcfProposalReviewForm`
- **Path**: `force-app/main/default/lwc/wcfProposalReviewForm/`
- **Apex Controllers**: [`WCF_ReviewFormJFController.cls`](file:///c:/Users/WELCOME/Desktop/WG%20sandbox/WG%20Sandbox/force-app/main/default/classes/WCF_ReviewFormJFController.cls), [`WCFReviewerMetadataController.cls`](file:///c:/Users/WELCOME/Desktop/WG%20sandbox/WG%20Sandbox/force-app/main/default/classes/WCFReviewerMetadataController.cls)
- **Key Functionality**:
  - 22-question qualitative evaluation scoring rubric across 7 categories.
  - 5-point evaluation scoring ladder (Very Weak = 1, Weak = 2, Adequate = 3, Strong = 4, Very Strong = 5).
  - Automatically calculates weighted category scores and overall recommendation percentage.

### 19. `wcfReviewerContainer`
- **Path**: `force-app/main/default/lwc/wcfReviewerContainer/`
- **Apex Controller**: `WCFProposalListController.cls`
- **Key Functionality**:
  - Reviewer split-screen workspace hosting `wcfFormPreview` on the left and `wcfProposalReviewForm` on the right.

### 20. `wcfRfiResponsePage`
- **Path**: `force-app/main/default/lwc/wcfRfiResponsePage/`
- **Apex Controller**: `WCFFormEngineController.cls`
- **Key Functionality**:
  - Dedicated revision workspace highlighting specifically flagged questions returned for clarification.

### 21. `wcfRfiWelcomePage`
- **Path**: `force-app/main/default/lwc/wcfRfiWelcomePage/`
- **Key Functionality**:
  - RFI onboarding and track overview page guiding applicants on required materials before starting.

### 22. `wcfValidatorContainer`
- **Path**: `force-app/main/default/lwc/wcfValidatorContainer/`
- **Apex Controller**: `WCFValidatorController.cls`
- **Key Functionality**:
  - Validator split-screen workspace embedding `wcfFormPreview` on the left and `wcfValidatorForm` on the right with a draggable divider.

### 23. `wcfValidatorForm`
- **Path**: `force-app/main/default/lwc/wcfValidatorForm/`
- **Apex Controller**: `WCFValidatorController.cls`
- **Key Functionality**:
  - 5-section quantitative screening form: Completeness, Alignment, Governance, Budget Checks, and Final Screening Decision.
  - Action buttons: **Pass (Validated)**, **Flag (Blocker)**, **Return for Revision**.

### 24. `wfGrantsSignup`
- **Path**: `force-app/main/default/lwc/wfGrantsSignup/`
- **Apex Controller**: `WFGrantsSignUpController.cls`
- **Key Functionality**:
  - Public registration form capturing organization name, contact details, country/state, creating Person Account and Community User.

### 25. `wgApproverDashboard`
- **Path**: `force-app/main/default/lwc/wgApproverDashboard/`
- **Apex Controller**: `WCFApproverListController.getApproverSummary`
- **Key Functionality**:
  - Executive dashboard displaying summary KPIs: *Ready for Decision*, *Approved Applications*, *Declined Applications*, *Returned to Reviewer*.

### 26. `wgReviewerDashboard`
- **Path**: `force-app/main/default/lwc/wgReviewerDashboard/`
- **Apex Controller**: `WCFProposalListController.cls`
- **Key Functionality**:
  - Reviewer workload dashboard displaying assigned evaluations, completed reviews, and SLA countdowns.

### 27. `wgSourcingChannelReport`
- **Path**: `force-app/main/default/lwc/wgSourcingChannelReport/`
- **Apex Controller**: `WCFValidatorController.getSourceChannelReport`
- **Key Functionality**:
  - Intake analytics report segmenting applications by sourcing channel (*WSN/WEN Nomination*, *Direct Outreach*, *Self-Signup*) and budget bands.

### 28. `wgValidatorDashboard`
- **Path**: `force-app/main/default/lwc/wgValidatorDashboard/`
- **Apex Controller**: `WCFValidatorController.getActionCounts`
- **Key Functionality**:
  - Validator queue summary tracking applications *To Validate*, *In Progress*, *Revalidations*, *Returned by Reviewer*, and *Validated*.

---

## 5. Apex Classes, Services & Controllers Architecture

```
force-app/main/default/classes/
├── WCFFormController.cls              # Master Dynamic Intake Controller (2,160 lines): Multi-Track Persistence, AI Feedback, Picklists, Files
├── WCFFormEngineController.cls        # JSON Deserialization, Multi-Track Data Mapping, Database Upserts
├── WCFFormMetadataController.cls      # Custom Metadata Loader (RFI_Track__mdt, RFI_Question__mdt)
├── WCFFormFiscalYearUtil.cls          # Fiscal Year Projections & Budget Calculation Utility
├── WCFValidatorController.cls         # Validator Screening Engine & Attachment Content Aggregator
├── WCF_ReviewFormJFController.cls     # Primary Reviewer Form Controller & Scoring Engine
├── WCFReviewerMetadataController.cls  # Reviewer Rubric & 5-Point Scoring Ladder Loader
├── WCFApproverListController.cls      # Executive Deliberation (Accept / Reject) Controller
├── WCFComplianceController.cls        # Applicant Compliance Checklist & File Manager
├── ComplianceDocumentController.cls   # Internal Compliance Request & Verification Controller
├── WCFProposalListController.cls      # Reviewer Queue Aggregator & 10-Day SLA Calculator
├── WCFPortalUserController.cls        # Server-Side RBAC Guard (assertRole) & User Context Service
├── WCFDashboardAccessController.cls   # Person Account Role Flag Resolver
├── RecordTypeHelper.cls               # Centralized RecordType DeveloperName to Id Resolver & Cache
├── ApplicationReviewHandler.cls       # Working Days Calculator & Consolidated Comments Aggregator
├── WCFComplianceDocumentTriggerHandler.cls # Compliance Stage Rollup & Onboarded Status Synchronizer
├── ProposalAIUpdater_WCF.cls          # Einstein GenAI Invocable Action & JSON Feedback Parser
├── OpenStreetMapService.cls           # Nominatim Real-Time Address Geocoding Service
└── WFGrantsSignUpController.cls       # Public Self-Registration & Person Account Provisioner
```

### 5.1. Deep Dive: `WCFFormController.cls` (Core Intake Engine)
`WCFFormController.cls` (2,160 lines) is the foundational backend controller powering the dynamic RFI applicant intake experience across all grant tracks:
- **Active Funding Opportunity Discovery** (`getActiveFundingOpportunityId`): Automatically detects and binds applications to the active `FundingOpportunity` record (`Status = 'Active'`, `FO_Type__c = 'WCF Proposal'`, `RecordType = 'WCF_Project_Proposal'`).
- **Real-Time AI Narrative Feedback Service** (`upsertAIFeedback`, `getAIFeedbackRecord`, `getFieldFeedback`): Dynamically manages applicant coaching feedback stored in `AI_Feedback__c`. Validates field schemas, creates submitter records on blur, and returns targeted feedback across legal structure, organizational sustainability, additional funding, operational synergies, job creation, and skilling approaches.
- **Dynamic Multi-Lingual Picklist Resolution** (`getPicklistValuesForField`): Inspects SObject field describes and metadata translations to dynamically render picklists in English, French, Portuguese, and Hindi.
- **Multi-Object Draft & Submission Engine** (`saveWCFDraftApplication`, `submitWCFApplication`):
  - Ingests structured JSON payloads and orchestrates transactional writes across `IndividualApplication` and child entities: `Historical_Data__c`, `Current_fiscal_year_data__c`, `Outcomes_Data__c`, `WCF_Business_Sector__c`, `WCF_Skilling_Domain__c`, `WCF_Livelihood_Program__c`, `WCF_Community__c`, and `WCF_Supporting_Document__c`.
  - Stretches across **3 funding tracks** (*Job Fulfillment*, *Job Creation*, *Livelihood Upliftment*), mapping questions Q1 through Q28 directly to target fields.
- **Draft Reconstitution** (`getDraftWCFApplication`): Rebuilds the complete `WCFDraftWrapper` data graph upon portal reload, restoring multi-year financial statements, outcome metrics, and uploaded files.
- **RFI Revision Persistence** (`saveRfiResponse`): Updates specifically flagged fields when an applicant responds to revision requests from `wcfRfiResponsePage`.
- **Granular File Cell Mapping & Validation** (`getOutcomeFilesByCell`, `setFileCellKey`, `getApplicationAttachments`, `deleteUploadedFile`, `validateUploadedFile`): Manages cell-specific attachment mappings for placement verification reports (Q24) and financial audits (Q28), enforcing file size limits and allowed extensions (`.pdf`, `.docx`, `.xlsx`).
- **Applicant Progress Snapshot** (`getApplicationStatusForUser`): Returns stage completion flags, submission round numbers, and pending action items for the logged-in user.

---

## 6. Detailed Analysis of All 8 Core Salesforce Flows

Below is the deep, complete analysis of the 6 core business flows and the 2 AI evaluation flows configured in the system:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    SALESFORCE FLOW MATRIX                                      │
├──────────────────────────────────┬───────────────────────┬─────────────────────────────────────┤
│ Flow Label / API Name            │ Trigger Event / Type  │ Core Actions & Automation           │
├──────────────────────────────────┼───────────────────────┼─────────────────────────────────────┤
│ 1. Wadhwani Grants - Email       │ Record-Triggered      │ Automated lifecycle notifications   │
│    (Wadhwani_Grants_Email)       │ IndividualApplication │ (14 EmailTemplate actions)          │
├──────────────────────────────────┼───────────────────────┼─────────────────────────────────────┤
│ 2. Update Submission Round Value │ Record-Triggered      │ Before-save versioning counter      │
│    (Update_Submission_Round_Val) │ IndividualApplication │ (Draft ➔ 1, Resubmit ➔ N+1)         │
├──────────────────────────────────┼───────────────────────┼─────────────────────────────────────┤
│ 3. Reviewer Email Alert - WG     │ Record-Triggered      │ Review assignment, SLA reminders    │
│    (Reviewer_Email_Alert_Wad..)  │ ApplicationReview     │ (3 In-Flow Rich HTML Templates)     │
├──────────────────────────────────┼───────────────────────┼─────────────────────────────────────┤
│ 4. WCF Application Decision Flow │ Record-Triggered      │ Committee decision alert to reviewer│
│    (WCF_Application_Decision_Fl) │ ApplicationDecision / │ (1 In-Flow Rich HTML Template)      │
│                                  │ ApplicationReview     │                                     │
├──────────────────────────────────┼───────────────────────┼─────────────────────────────────────┤
│ 5. WCF Approver Email Alert Flow │ Record-Triggered      │ Ready for decision, decline alerts  │
│    (WCF_Approver_Email_Alert_Fl) │ ApplicationReview     │ (3 In-Flow Rich HTML Templates)     │
├──────────────────────────────────┼───────────────────────┼─────────────────────────────────────┤
│ 6. WF Compliance Document flow   │ Record-Triggered      │ Compliance lifecycle, reminders     │
│    (WF_Compliance_Document_flow) │ Compliance Document / │ (12 EmailTemplate actions)          │
│                                  │ IndividualApplication │                                     │
├──────────────────────────────────┼───────────────────────┼─────────────────────────────────────┤
│ 7. AI Feedback to Prompt         │ Record-Triggered /    │ Prepares JSON payload & prompts     │
│    (AI_Feedback_to_Prompt)       │ Screen Flow           │ Einstein GenAI models               │
├──────────────────────────────────┼───────────────────────┼─────────────────────────────────────┤
│ 8. AI Feedback Update in Proposal│ Record-Triggered      │ Parses GenAI response & populates   │
│    (AI_Feedback_Update_in_Prop..)│ IndividualApplication │ numerical ratings & strengths       │
└──────────────────────────────────┴───────────────────────┴─────────────────────────────────────┘
```

---

### Flow 1: `Wadhwani Grants - Email` (`Wadhwani_Grants_Email.flow-meta.xml`)
- **Trigger**: Record-Triggered on `IndividualApplication` (After Insert, After Update).
- **Sender Address**: `grants.support@wadhwanifoundation.org` (Org-Wide Email Address).
- **Core Email Actions & Templates Invoked**:
  1. `Draft_Mail_to_Applicant`: Calls `WCF_Folder/Draft_Saved` ➔ Sent to `$Record.Account.PersonContactId` upon saving initial draft.
  2. `Submitted_Mail_to_Applicant`: Calls `WCF_Folder/Application_Received` ➔ Sent to `$Record.Account.PersonContactId` upon initial proposal submission.
  3. `Email_to_Validator_on_Application_submission` & `Copy_1_of_Email_to_Validator_on_Application_submission`: Calls `WCF_Folder/New_Application_Validator_Queue` ➔ Sent to `WCFValidatorContactId` notifying validator team of a pending submission.
  4. `Email_to_alert_validator_on_due_near_ending`: Calls `WCF_Folder/Validation_Due_Soon` ➔ Sent to `WCFValidatorContactId` when validator screening SLA is expiring.
  5. `Revision_Request_mail_to_applicant`: Calls `WCF_Folder/Action_Required_Update_Application` ➔ Sent to `$Record.Account.PersonContactId` when Validator returns application for revisions.
  6. `Resubmitted_mail_to_Applicant`: Calls `WCF_Folder/Resubmission_Received_Partner` ➔ Sent to `$Record.Account.PersonContactId` confirming revised submission receipt.
  7. `Returned_to_Validator_Alert` (*Label: The reviewer needs more information E-48*): Calls `WCF_Folder/Additional_Information_Requested` ➔ Sent to `WCFValidatorContactId` when reviewer returns proposal.
  8. `Send_30_Day_Revision_Reminder_Email`: Calls `WCF_Folder/Additional_Information_Reminder` ➔ Scheduled reminder sent to `$Record.Account.PersonContactId` after 30 days of inactivity in `Revision Requested`.
  9. `Send_100_Day_Closure_Email`: Calls `WCF_Folder/We_are_closing_your_application_for_now` ➔ Sent to `$Record.Account.PersonContactId` closing application after 100 days without revision response.
  10. `Under_Review_mail_to_applicant`: Calls `WCF_Folder/Application_Validated_Under_Review` ➔ Sent to `$Record.Account.PersonContactId` when Validator marks screening as `Pass`.
  11. `Send_Information_Located_Email_to_Reviewer` (*Label: Information located, review can resume E-49*): Calls `WCF_Folder/Information_Located_Review_Can_Resume` ➔ Sent to `Get_Reviewer_Account.PersonContactId`.
  12. `Send_Returned_by_Approver_Email_to_Reviewer` (*Label: Returned for additional detail E-51*): Calls `WCF_Folder/Approver_Further_Detail_Request_PL` ➔ Sent to `Get_Reviewer_Account.PersonContactId`.
  13. `Grant_Approved_Mail_to_Applicant`: Calls `WCF_Folder/Application_Approved` ➔ Sent to `$Record.Account.PersonContactId` upon final committee approval.
  14. `Grant_not_approved_mail_for_applicant`: Calls `WCF_Folder/Application_Decision_Declined` ➔ Sent to `$Record.Account.PersonContactId` upon decline.

---

### Flow 2: `Update Submission Round Value on Proposal Object` (`Update_Submission_Round_Value.flow-meta.xml`)
- **Trigger**: Record-Triggered on `IndividualApplication` (Before Save / Before Update).
- **Purpose**: Proposal lifecycle audit versioning and submission round tracking.
- **Detailed Logic**:
  - **Path 1 (Initial Submission)**: When `Status` transitions from `Draft` to `Submitted`, sets `Submission_Round__c = 1`.
  - **Path 2 (Resubmission)**: When `Status` transitions from `Revision Requested` to `Resubmitted`, increments `Submission_Round__c = PRIORVALUE(Submission_Round__c) + 1`.
  - Maintains historical revision cycle logs without calling email actions directly.

---

### Flow 3: `Reviewer Email Alert - Wadhwani Grants` (`Reviewer_Email_Alert_Wadhwani_Grants.flow-meta.xml`)
- **Trigger**: Record-Triggered on `ApplicationReview` (After Insert, After Update).
- **Filter Criteria**: `RecordType.DeveloperName = 'WG_Reviewer'`.
- **Sender Address**: `grants.support@wadhwanifoundation.org`.
- **Email Mechanism**: Configured with **In-Flow Rich HTML Text Templates**:
  1. **`New_Evaluation_Template`** (Action): Uses in-flow text template `{!New_Evaluation_Assinged}`.
     - **Subject**: `[Ref: Subject]` (`New Evaluation Assigned: {!$Record.Application.Name}`)
     - **Recipient**: `Get_Account_details.PersonContactId`.
     - **Fires When**: Reviewer is assigned to an application (`Status = 'In Progress'`).
  2. **`Due_Date_Reminder_Alert`** (Action): Uses in-flow text template `{!EvaluationDueSoon}`.
     - **Subject**: `[Ref: Subject_for_Due_Alert]` (`Reminder: Evaluation Due Soon for {!$Record.Application.Name}`)
     - **Recipient**: `Copy_1_of_Get_Account_details.PersonContactId`.
     - **Fires When**: Scheduled path triggers 3 working days prior to `ApplicationReview.DueDate`.
  3. **`Mail_to_Reviewer_at_Passed`** (Action): Uses in-flow text template `{!Passed_toreview}`.
     - **Subject**: `Application passed to you with a flagged concern`
     - **Recipient**: `Get_Account_details.PersonContactId`.
     - **Fires When**: Validator passes application to review with `Flagged__c = true`.

---

### Flow 4: `WCF Application Decision Flow` (`WCF_Application_Decision_Flow.flow-meta.xml`)
- **Trigger**: Record-Triggered on `ApplicationDecision` / `ApplicationReview` executive deliberations.
- **Sender Address**: `grants.support@wadhwanifoundation.org`.
- **Email Mechanism**: Configured with **In-Flow Rich HTML Text Template**:
  1. **`Decision_Email_to_Reviewer`** (Action): Uses in-flow text template `{!DecisionRecorded}`.
     - **Subject**: `[Ref: Subject]` (`Decision Recorded on Proposal: {!$Record.Application.Name}`)
     - **Recipient**: `Get_Reviewer_Account.PersonContactId`.
     - **Fires When**: Executive Approver records final funding decision (Accept / Reject), providing formal closure to the assigned reviewer.

---

### Flow 5: `WCF Approver Email Alert Flow` (`WCF_Approver_Email_Alert_Flow.flow-meta.xml`)
- **Trigger**: Record-Triggered on `ApplicationReview` (After Update).
- **Sender Address**: `grants.support@wadhwanifoundation.org`.
- **Email Mechanism**: Configured with **In-Flow Rich HTML Text Templates**:
  1. **`Ready_for_Decision_Email_Alert`** (Action): Uses in-flow text template `{!Approver_ReadyForDecision}`.
     - **Subject**: `[Ref: Subject_Ready]` (`{!$Record.Application.Name} — all evaluations complete, ready for decision`)
     - **Recipient**: `Get_Approver_Account.PersonContactId`.
     - **Fires When**: Reviewer submits score (`Status = 'Review Submitted'`) and recommendation is positive.
  2. **`Decline_Recommended_Email`** (Action): Uses in-flow text template `{!DeclineRecommended_Email}`.
     - **Subject**: `[Ref: Subject_Decline]` (`Decline recommended: your decision by {!$Record.Due_Date_For_Approver__c}`)
     - **Recipient**: `Get_Approver_Account.PersonContactId`.
     - **Fires When**: Reviewer submits evaluation recommending decline with justification.
  3. **`Decision_OVerdue_Email`** (Action): Uses in-flow text template `{!Overdue_decision}`.
     - **Subject**: `Overdue: your funding decision on this application`
     - **Recipient**: `Get_Approver_Account_Scheduled.PersonContactId`.
     - **Fires When**: Scheduled path fires when decision is not recorded within 10 working days of `Due_Date_For_Approver__c`.

---

### Flow 6: `WF Compliance Document flow` (`WF_Compliance_Document_flow.flow-meta.xml`)
- **Trigger**: Record-Triggered on `WCF_Compliance_Document__c` / `IndividualApplication`.
- **Sender Address**: `grants.support@wadhwanifoundation.org`.
- **Core Email Actions & Templates Invoked**:
  1. `Compliance_Document_Requested` (*Label: Compliance documents requested E-12*): Calls `WCF_Folder/Compliance_Documents_Requested` ➔ Sent to `Get_Applicant_Email.Id`.
  2. `Document_Upload_Started` (*Label: Your document upload has started E-62*): Calls `WCF_Folder/Compliance_your_document_upload_has_started` ➔ Sent to `Get_Applicant_Email.Id` when applicant first saves draft compliance item.
  3. `Document_Submitted_Applicant` (*Label: We have received your documents E-25*): Calls `WCF_Folder/We_have_received_your_compliance_documents` ➔ Sent to `Get_Applicant_Email.Id` upon submission of compliance packet.
  4. `Compliance_documents_submitted_for_review`: Calls `WCF_Folder/Compliance_documents_submitted_for_review` ➔ Sent to `Get_Reviewer.PersonContactId`.
  5. `Send_Doc_Revision_Email` (*Label: Compliance document updates needed E-24*): Calls `WCF_Folder/Compliance_Revision_Requested` ➔ Sent to `Get_Applicant_Email.Id` when compliance officer requests updated certificates.
  6. `Compliance_Documents_Reminder_Email_30` (*Label: Reminder on compliance documents 30d E-56*): Calls `WCF_Folder/Compliance_Documents_Reminder_30_days` ➔ Sent to `Get_Contact.Id` after 30 days.
  7. `Compliance_Documents_Reminder_Email_60` (*Label: Reminder on compliance documents 60d E-56*): Calls `WCF_Folder/Compliance_Documents_Reminder_60_days` ➔ Sent to `Get_Contact_60.Id` after 60 days.
  8. `Compliance_Documents_Reminder_Email_90` (*Label: Reminder on compliance documents 90d E-56*): Calls `WCF_Folder/Compliance_Documents_Reminder_90_days` ➔ Sent to `Get_Contact_90.Id` after 90 days.
  9. `Copy_1_of_Reminder_on_compliance_documents_90d_E_56`: Calls `WCF_Folder/Compliance_Documents_Reminder` ➔ Sent to `Get_Contact_100.Id`.
  10. `Send_Onboarding_Suspended_Email` (*Label: Account suspended on compliance E-59*): Calls `WCF_Folder/Your_account_is_suspended` ➔ Sent to `Get_Applicant_Email.Id` when compliance deadline is exceeded (100 days).
  11. `Approved_Email` (*Label: Compliance documents approved E-63*): Calls `WCF_Folder/Compliance_Documents_Approved` ➔ Sent to `Get_Applicant_Email.Id` when all compliance docs are marked `Validated`.
  12. `Send_Pause_Email`: Calls `WCF_Folder/We_have_paused_your_onboarding` ➔ Sent to applicant when onboarding is temporarily placed on administrative hold.

---

### Flow 7: `AI Feedback to Prompt` (`AI_Feedback_to_Prompt.flow-meta.xml`)
- **Trigger**: Autolaunched / Screen Flow triggered on proposal submission.
- **Functionality**: Extracts proposal responses across Legal Structure, Skilling Approach, Target Demographics, and Multi-Year Outcomes, assembling prompt inputs for the Einstein GenAI engine.

### Flow 8: `AI Feedback Update in Proposal` (`AI_Feedback_Update_in_Proposal.flow-meta.xml`)
- **Trigger**: Record-Triggered on `IndividualApplication`.
- **Functionality**: Receives the response payload from GenAI prompt templates, executes Apex action `ProposalAIUpdater_WCF.updateProposal`, and writes parsed scores (`Governance_Rating__c`, `Impact_Rating__c`, `AI_Summary__c`) back to the proposal.

---

## 7. Apex Triggers & Handlers (Active Architecture Only)

Per the active production architecture, only **2 core Apex triggers** are utilized across the grant process:

```
force-app/main/default/triggers/
├── ApplicationReviewTrigger.trigger       # Active Core Trigger on ApplicationReview
└── WCFComplianceDocumentTrigger.trigger   # Active Core Trigger on WCF_Compliance_Document__c
```

---

### 7.1. `ApplicationReviewTrigger`
- **SObject**: `ApplicationReview`
- **Events**: `before insert`, `before update`, `after insert`, `after update`
- **Handler Class**: [`ApplicationReviewHandler.cls`](file:///c:/Users/WELCOME/Desktop/WG%20sandbox/WG%20Sandbox/force-app/main/default/classes/ApplicationReviewHandler.cls)
- **Record Type Enforcements**:
  - `WCF_Validator`: Enforces Validator screening rules.
  - `WG_Reviewer`: Enforces Reviewer qualitative evaluation rules.
- **Core Business Logic**:
  1. **Consolidated Return Comments Aggregator**:
     - Calls `ApplicationReviewHandler.populateConsolidatedComments()`.
     - Scans `Question_Number_1__c` through `Question_Number_28__c` for revision feedback.
     - Dynamically formats and maps canonical question numbers based on the application's funding track into `ApplicationReview.Consolidated_Return_Comments__c`.
  2. **Reviewer Name & Completion Date Tracking**:
     - Automatically stamps `WG_Reviewer_Name__c = UserInfo.getName()`.
     - When `Status = 'Review Submitted'`, sets `Evaluation_Completed__c = Date.today()` and computes `Due_Date_For_Approver__c = ApplicationReviewHandler.addWorkingDays(Date.today(), 10)`.
  3. **Validator SLA & Working Days Calculation**:
     - When Validator seals record (`Status = 'Validated'`), stamps `Validator_Submission_Date__c = Date.today()`.
     - Sets `DueDate = ApplicationReviewHandler.addWorkingDays(Date.today(), 10)` (excluding weekends).
  4. **Validator Decision Override & Proposal Status Sync**:
     - If `Decision_Final_Decision_from_Sec_1_2__c == 'Flag'`, overrides `ApplicationReview.Status = 'Flagged'` and sets `IndividualApplication.Flagged__c = true`.
     - If `Decision_Final_Decision_from_Sec_1_2__c == 'Return'`, overrides `ApplicationReview.Status = 'Revision Request'` and updates `IndividualApplication.Status = 'Revision Requested'`.
     - If `Decision_Final_Decision_from_Sec_1_2__c == 'Pass'`, sets `IndividualApplication.Validated__c = true` and stamps `IndividualApplication.WG_Validator_Name__c = UserInfo.getName()`.

---

### 7.2. `WCFComplianceDocumentTrigger`
- **SObject**: `WCF_Compliance_Document__c`
- **Events**: `after insert`, `after update`
- **Handler Class**: [`WCFComplianceDocumentTriggerHandler.cls`](file:///c:/Users/WELCOME/Desktop/WG%20sandbox/WG%20Sandbox/force-app/main/default/classes/WCFComplianceDocumentTriggerHandler.cls)
- **Core Business Logic**:
  1. Monitors all updated `WCF_Compliance_Document__c` records where `Status__c` changes.
  2. Calls `WCFComplianceDocumentTriggerHandler.syncOnboardedStatus(applicationIds)`.
  3. Invokes `WCFComplianceController.computeOnboardingStage(appId)`:
     - Evaluates all mandatory compliance documents for the organization's geography (80G, 12A, FCRA, Audited Financials, Master MoU).
     - When all mandatory documents reach `Status__c = 'Validated'`, automatically updates `IndividualApplication.Status = 'Onboarded'`.

---

## 8. Static Resources Catalog & Third-Party Client Libraries

| Static Resource Name | Type | Key Purpose & Libraries Included |
|---|---|---|
| `wcfPortalStyles` | CSS | Global design system stylesheet (SLDS overrides, glassmorphism, responsive grid) |
| `wcfFormFocusStyles` | CSS | Accessibility and focus-state outline definitions for form inputs |
| `wcfLogos` | Archive (ZIP) | Wadhwani Foundation SVG, PNG, and white-label branding assets |
| `WIN_Logo` | Image (PNG) | High-resolution Wadhwani Foundation grant header logo |
| `flagTelpicker` | JS / CSS | International telephone input library with country dial codes and flags |
| `downloadjs` | JS Library | Client-side file download utility for dynamically generated summaries |
| `autotable` | JS Plugin | jsPDF AutoTable plugin for generating formatted PDF preview tables |
| `mammoth` | JS Library | In-browser `.docx` to HTML converter for client-side preview rendering |
| `xlsx` | JS Library | SheetJS library for parsing and previewing Excel budget sheets in browser |
| `ChartJS` | JS Library | Data visualization engine for sourcing reports and reviewer completion charts |
| `PapaParse` | JS Library | Fast CSV parsing library for bulk applicant data import |

---

## 9. Complete Data Model & Field Dictionary

### 9.1. Core SObjects & `IndividualApplication` Data Dictionary

The master intake object `IndividualApplication` serves as the central anchor for the entire grant lifecycle, linked to standard review entities and 18+ custom child objects:

#### 1. `IndividualApplication` (Master Grant Proposal)
- **Record Type**: `Wadhwani_Grants`

##### A. Lifecycle, Status & Routing Engine
- `Status` (Picklist): `Draft`, `Submitted`, `Under Review`, `Revision Requested`, `Resubmitted`, `Approved for Funding`, `Not Approved`, `Onboarded`, `Closed`.
- `Submission_Round__c` (Number): Incremental version counter managed by `Update_Submission_Round_Value` flow (`1` on initial submit, incremented upon resubmission).
- `Validated__c` (Checkbox): Set to `true` by `ApplicationReviewTrigger` when Validator marks screening `Pass`.
- `Flagged__c` (Checkbox): Set to `true` by `ApplicationReviewTrigger` when Validator or Reviewer flags a critical operational concern.
- `SavedApplicationRefId` (Lookup -> `SavedApplication`): Reference to Experience Cloud auto-saved session state.
- `WasReturned` (Checkbox): System audit flag indicating whether the proposal was ever returned for applicant revisions.
- `Resubmitted_Approved_for_Funding__c` (Checkbox): Flags resubmitted applications subsequently approved by committee.
- `RequirementsCompleteDate` (Date/Time): Timestamp recording when all mandatory RFI questions were satisfied.
- `Submitted_notes__c` (Text): Applicant submission comments and remarks.

##### B. Staff, Persona & Workflow Audit Stamps
- `WG_Validator_Name__c` (Text): Name of the Validator who executed Stage 1 screening.
- `WG_Reviewer_Name__c` (Text): Name of the Reviewer who finalized Stage 2 qualitative evaluation.
- `WG_Approver_Name__c` (Text): Name of the Approver who recorded the executive committee decision.
- `Submitter_Name__c` (Text): Full name of the applicant authorized SPOC who submitted the form.
- `Work_Email_ID__c` (Email): Official institutional email of the primary submitter.
- `WG_Phone_Country_Code__c` (Text): International dialing country code (e.g., `+1`, `+91`, `+254`).
- `AccountId` / `ContactId` (Lookup -> `Account` / `Contact`): Link to applicant Person Account.
- `Application_Approver__c` (Lookup -> `User`): Designated staff approver.
- `Rejected_by_COE_on__c` (Date): Timestamp when COE rejected intake prior to review.

##### C. Funding Track & Categorization
- `Organizational_Area_s_for_Funding_Inves__c` / `Organizational_Area_s_for_Funding_Inves1__c` (Picklist): Selected primary track (*Job Fulfillment*, *Job Creation*, *Livelihood Upliftment*).
- `Selected_Funding_Tracks__c` (Text): Concatenated track string for dynamic form rendering.
- `Sub_Focus_Area__c` / `Sub_Focus_Area_2__c` / `Sub_Focus_Area_3__c` (Multiselect Picklist): Primary and secondary thematic focus areas.
- `Sub_Focus_Area_Other__c` (Text): Write-in for unlisted focus disciplines.

##### D. Organization Demographics & Multi-National Legal Structure
- `Legal_Structure__c` (Picklist): Entity registration type (Trust, Society, Section 8 Non-Profit, Private Limited, 501(c)(3)).
- `Legal_Structure_Other__c` (TextArea): Write-in description for alternative legal structures.
- `Applicant_Type__c` (Picklist): Institutional categorization (*Non-Profit*, *For-Profit Social Enterprise*, *Academic / Research Hub*).
- `Date_of_Incorporation_Registration__c` (Date): Legal registration date.
- `Registration_Jurisdiction__c` (Picklist): Country of legal incorporation.
- `Registration_Jurisdiction_Other__c` (TextArea): Write-in for unlisted jurisdictions.
- `Are_you_FCRA_registered__c` (Picklist) / `FCRA_Registration_Number__c` (Text) / `FCRA_Valid_Till__c` (Date): Foreign Contribution Regulation Act (FCRA) status, license number, and expiration date.
- `Do_you_have_12A_registration__c` (Picklist) / `X12A_Registration_Number__c` (Text) / `X12A_Registration_Valid_Till__c` (Date): Income Tax 12A tax exemption registration details.
- `Do_you_have_80G_registration__c` (Picklist) / `X80G_Registration_Number__c` (Text) / `X80G_Registration_Valid_Till__c` (Date): Income Tax 80G donor deduction certificate details.
- `Do_you_have_a_valid_501_c_3_in_the_US__c` (Picklist) / `X501_c_3_Valid_Till__c` (Date): US Internal Revenue Code 501(c)(3) determination status.
- `Equivalency_Determination_Certified__c` (Picklist) / `Equivalency_Determination_Expiry_Date__c` (Date) / `Willing_to_Pursue_ED__c` (Picklist): NGOsource Equivalency Determination (ED) certification.
- `Startup_Name__c` (Text) / `Startup_Registration_No__c` (TextArea) / `Startup_Registration_Date__c` (Date): DPIIT / Startup entity identifiers where applicable.

##### E. Financial Budgets & Multi-Year Funding Strategy
- `Total_Budget__c` / `Total_Project_Budget_INR__c` / `Total_Project_Budget_in_USD__c` (Currency): Overall project budget in local and standard USD currencies.
- `RequestedAmount` (Currency): Total grant funding requested from Wadhwani Foundation.
- `Project_Duration__c` (Number): Project execution timeline in months.
- `Project_Start_Date__c` / `Project_End_Date__c` (Date): Formal project lifecycle dates.
- `Target_Completion_Month_c__c` (Number): Milestone target duration.
- `Proposed_WIN_Grant_Utilization__c` (Rich Text HTML): Detailed line-item cost breakdown of requested grant funds.
- `Project_Revenue_Strategy__c` (Rich Text HTML): Long-term financial sustainability and earned revenue model.
- `Revenue_Explanation__c` (Long Text Area): Detailed narrative explaining historical financial fluctuations.
- `Use_of_Additional_Funding__c` / `Use_of_Additional_Funding_JC__c` (Rich Text HTML): Deployment strategy for additional co-funding or matching capital.

##### F. Project Narratives & Technical Workplan
- `Project_Title__c` (Text): 1.1 Project Title.
- `Project_Summary__c` (Rich Text HTML): Executive summary of the grant initiative.
- `Proposed_Solution__c` (Rich Text HTML): Technical description of proposed intervention and delivery model.
- `Project_Approach_and_Work_Plan__c` (Long Text Area): Execution methodology, phases, and milestone work plan.
- `Proposed_Outcomes_Deliverables_under_t__c` (Rich Text HTML): Target beneficiaries, outputs, and quantifiable deliverables.
- `Target_Market_Industry_Application__c` (Rich Text HTML): Market analysis and industry alignment.
- `Job_Creation_Approach__c` (Long Text Area): Direct & indirect job creation mechanism for enterprise development.
- `Skilling_Approach__c` (Long Text Area): Curriculum, pedagogical approach, and employer placement linkage.
- `Livelihood_Approach__c` (Long Text Area): Household income enhancement and cluster development strategy.
- `Operational_Synergies_with_WOF__c` / `Operational_Synergies_with_WOF_JC__c` (Rich Text HTML): Strategic and technology synergies with Wadhwani Operating Foundation assets.
- `Relevant_Partnerships__c` (Long Text Area): Government, corporate, and ecosystem consortium partners.
- `Project_Team_Members__c` (Long Text Area): Profiles, roles, and time commitments of core execution team.
- `Current_Technology_Readiness_Level_TRL__c` (Picklist): TRL 1 (Basic Principles) through TRL 9 (Proven Operational).
- `Work_undertaken_supporting_current_TRL__c` (Rich Text HTML): Evidence validating current TRL maturity.
- `Strategy_for_raising_funds_from_Investor__c` (Rich Text HTML): Follow-on venture or philanthropic fundraising plan.
- `Strategy_for_transfer_of_technology__c` (Rich Text HTML): IP commercialization and technology transfer roadmap.
- `Project_Website_if_any__c` (URL): Public portal or pilot demonstration link.
- `WIN_Support__c` (Rich Text HTML): Non-financial capacity building support requested from Wadhwani Foundation.

##### G. Governance & Institutional References
- `Reference_1_Name__c` / `Reference_1_Role__c` / `Reference_1_Email__c` (TextArea / Email): Contact information for primary institutional referee.
- `Reference_2_Name__c` / `Reference_2_Role__c` / `Reference_2_Email__c` (TextArea / Email): Contact information for secondary institutional referee.

##### H. Outcome Verification & Supporting Attachments
- `Q24_VERIFIED__c` (Picklist): Third-party verification status for placement claims (*Yes / No / Pending*).
- `Q24_REPORT_URL__c` (URL): Cloud storage link to independent third-party audit report.
- `Requested_Support_Documents_Portal_c__c` (Long Text Area): Itemized list of supplementary documents requested by reviewers.

##### I. Einstein GenAI Automated Ratings & Rubric Scores
- `AI_Rating__c`, `Governance_Rating__c`, `Legal_Rating__c` (Number): Automated GenAI scores (1–5 scale).
- `Job_Creation_Approach_Rating__c` / `Job_Creation_Approach_Strength__c` / `Job_Creation_Approach_Summary__c` / `Job_Creation_Approach_Weakness__c`: GenAI rubric evaluation for Job Creation narratives.
- `Skilling_Approach_Rating__c` / `Skilling_Approach_Strength__c` / `Skilling_Approach_Summary__c` / `Skilling_Approach_Weakness__c`: GenAI rubric evaluation for Skilling narratives.
- `Livelihood_Approach_Rating__c` / `Livelihood_Approach_Strength__c` / `Livelihood_Approach_Summary__c` / `Livelihood_Approach_Weakness__c`: GenAI rubric evaluation for Livelihood narratives.
- `Use_of_Funds_Rating__c` / `Use_of_Funds_Strength__c` / `Use_of_Funds_Summary__c` / `Use_of_Funds_Weakness__c` / `Use_of_Funds_AI_Feedback__c`: GenAI budget efficiency and utilization audit.

---

#### 2. `ApplicationReview` (Screening & Scoring Entity)
- **Record Types**:
  - `WCF_Validator`: Quantitative screening and document verification.
  - `WG_Reviewer`: Qualitative rubric evaluation across 7 categories and 22 criteria.
- **Key Fields**:
  - `Status` (Picklist): `Draft`, `In Progress`, `Validated`, `Review Submitted`, `Flagged`, `Revision Request`.
  - `DueDate` (Date): 10-day business SLA computed by `ApplicationReviewHandler.addWorkingDays()`.
  - `Due_Date_For_Approver__c` (Date): 10-day SLA for executive committee deliberation.
  - `Consolidated_Return_Comments__c` (Long Text Area): Auto-compiled feedback across questions Q1–Q28.
  - `Question_Number_1__c` to `Question_Number_28__c` (Text/TextArea): Specific validator feedback per question.
  - `Decision_Final_Decision_from_Sec_1_2__c` (Picklist): `Pass`, `Flag`, `Return`.
  - `Overall_Score__c` (Number): Aggregate weighted qualitative score calculated by `WCF_ReviewFormJFController.cls`.

---

#### 3. `ApplicationDecision` (Executive Sign-Off)
- **Record Type**: `WG_Approver`
- **Key Fields**:
  - `Status` (Picklist): `Draft`, `Approved`, `Declined`.
  - `Decision_Notes__c` (Long Text Area): Committee deliberation comments and approval rationale.
  - `IndividualApplication__c` (Lookup -> `IndividualApplication`): Parent proposal reference.

---

### 9.2. Custom Objects & Child Data Entities Architecture

The active WCF architecture incorporates the following custom objects and data tables directly linked to or supporting `IndividualApplication`:

| # | Custom Object API Name | Relationship to IndividualApplication | Key Functional Purpose & Core Fields |
|---|---|---|---|
| 1 | `Historical_Data__c` | **Master-Detail** via `Proposal__c` | **Trailing 3-Year Audited Financial Statements**: Stores balance sheet and income statement metrics across FY-1, FY-2, and FY-3.<br>• `Financial_Year__c` (Picklist: FY-1, FY-2, FY-3)<br>• `Starting_Balance__c`, `Total_Revenues_Excl_Grants__c`, `Total_Grants__c`, `Total_Expenses__c`, `Ending_Balance__c`, `Surplus_Deficit__c`<br>• `Donation_Grant_INR__c`, `Government_Grant_INR__c`, `Other_Revenues__c`<br>• `Financial_Year_Status__c` (Audited / Provisional) |
| 2 | `Current_fiscal_year_data__c` | **Master-Detail** via `Proposal__c` | **Current Fiscal Year (CFY) Operational Budget**: Captures current year annualized budget, run-rate expenses, and projected grants.<br>• `Starting_Balance__c`, `Total_Revenues_Excl_Grants__c`, `Total_Grants__c`, `Total_Expenses__c`, `Ending_Balance__c`<br>• `Donation_Grant_INR__c`, `Government_Grant_INR__c`, `Other_Revenues__c` |
| 3 | `Outcomes_Data__c` | **Master-Detail** via `Proposal__c` | **Multi-Year Beneficiary & Outcome Metrics**: Tracks skilling, placement, wage uplift, enterprise creation, and livelihood impact across FY-1, FY-2, FY-3, and CFY.<br>• `Enrolled_Trained_FY_1__c`–`3__c`, `Enrolled_Trained_CFY__c`<br>• `Placed_FY_1__c`–`3__c`, `Placed_CFY__c`, `Projected_Learner_placement_CFY__c`<br>• `Retained_Jobs_6Mo_FY_1__c`–`3__c`, `Retained_Jobs_6Mo_CFY__c`<br>• `Avg_Wage_Uplift_FY_1__c`–`3__c`, `Avg_Wage_Uplift_CFY__c`<br>• `Projected_New_Businesses_FY_1__c`–`3__c`, `Projected_Jobs_from_New_Businesses_FY1__c`–`3__c`<br>• `LIV_SERVED_FY1__c`–`3__c`, `LIV_OUTCOME_FY1__c`–`3__c`, `LIV_HH_INCOME_INCR_FY1__c`–`3__c`<br>• `Manual_Avg_Cost_per_Placement_FY_1__c`–`3__c`, `Manual_Avg_Cost_per_Job_FY_1__c`–`3__c`<br>• `X3rd_Party_Placement_Verification_FY_1__c`–`3__c`, `X3rd_party_verification_details_FY1__c`–`3__c` |
| 4 | `WCF_Business_Sector__c` | **Master-Detail** via `Proposal__c` | **Job Creation Sector Breakdown**: Configures enterprise segments supported under Job Creation track.<br>• `Sector_c__c` (Picklist: IT/BPO, Healthcare, Retail, Manufacturing, Agriculture, Green Jobs, etc.)<br>• `Business_Sector_Other__c` (TextArea)<br>• `Support_Types__c` (Multiselect: Incubation, Mentorship, Market Linkages, Credit Access)<br>• `Yearly_Enrolment__c` (Number)<br>• `Support_Begin_Date__c` (Date) |
| 5 | `WCF_Skilling_Domain__c` | **Master-Detail** via `Proposal__c` | **Job Fulfillment Vocational Domains**: Configures training programs under Job Fulfillment track.<br>• `Domain_Programme_Name__c` (Long Text Area)<br>• `Duration_Months__c` (Number)<br>• `Hours_of_Training__c` (Number)<br>• `Yearly_Enrolment__c` (Number)<br>• `Programme_Start_Date__c` (Date) |
| 6 | `WCF_Livelihood_Program__c` | **Master-Detail** via `Proposal__c` | **Livelihood Upliftment Initiatives**: Configures community livelihood programs and cluster initiatives.<br>• `Program_Name__c` (Text)<br>• `Support_Type_Provided__c` (Text)<br>• `Duration_Man_Hours__c` (Number)<br>• `Annual_Enrollment__c` (Number) |
| 7 | `WCF_Community__c` | **Master-Detail** via `Proposal__c` | **Target Communities & Geographies**: Geographic reach and beneficiary household counts.<br>• `District_Area__c` (Text)<br>• `State__c` (Picklist)<br>• `Households_FY1__c`, `Households_FY2__c`, `Households_FY3__c`, `Households_Projected__c` (Number) |
| 8 | `WCF_Supporting_Document__c` | **Master-Detail** via `Proposal__c` | **Outcome Verification & Audit Attachments**: Stores external audit links and verification reports.<br>• `Document_Name__c` (Text)<br>• `Cloud_Storage_Link__c` (URL) |
| 9 | `WCF_Compliance_Document__c` | **Lookup** via `IndividualApplication__c` | **Regulatory Compliance Certificates**: Tracks statutory documents required for onboarding.<br>• `Document_Type__c` (Picklist: 80G, 12A, FCRA, Audited Statements, Master MoU)<br>• `Status__c` (Picklist: `Not Started`, `Draft Saved`, `Pending Review`, `Validated`, `Action Needed`)<br>• `File_Name__c` (Text), `Issue_Date__c` (Date), `Expiry_Date__c` (Date)<br>• `Geography__c` (Picklist: India, USA, Global)<br>• `Organisation__c` (Lookup -> `Account`), `Notes__c`, `Reviewer_Notes__c` |
| 10 | `WCF_Executed_Agreement_c__c` | **Lookup** via `IndividualApplication__c` | **Grant Agreement & Legal Contracts**: Tracks executed grant agreements and counter-signatures.<br>• `AgreementmType__c` (Picklist: Master MoU, Specific Grant Agreement, Addendum)<br>• `Executed_Date__c` (Date), `Expiry_Date__c` (Date)<br>• `Has_Signed_PDF__c` (Checkbox), `Status__c` (Picklist: Draft, Signed, Active, Expired) |
| 11 | `AI_Feedback__c` | **Submitter Name / Proposal Link** | **Real-Time GenAI Narrative Cache**: Persists AI-generated applicant coaching feedback on blur.<br>• `Submitter_Name__c` (Text)<br>• `Legal_Structure__c` / `Legal_Structure_FR__c` (HTML)<br>• `Organizational_Sustainability__c` / `Organizational_Sustainability_FR__c` (HTML)<br>• `Use_of_Additional_Funding__c` / `Use_of_Additional_Funding_FR__c` (HTML)<br>• `Operational_Synergies_with_WOF__c` / `Operational_Synergies_with_WOF_FR__c` (HTML)<br>• `Job_Creation_Approach__c` / `Job_Creation_Approach_FR__c` (HTML / LongText)<br>• `Skilling_Approach__c` / `Skilling_Approach_FR__c` (HTML)<br>• `Livelihood_Approach__c` / `Livelihood_Approach_FR__c` (HTML / LongText)<br>• `Revenue_Explanation__c` / `Revenue_Explanation_FR__c` (HTML) |
| 12 | `Application_FAQ__c` | **Independent Repository** | **Applicant Knowledge Base & FAQs**: Searchable help articles rendered in `wcfApplicationFaqModal`.<br>• `Question__c` (Text), `Description__c` (HTML)<br>• `Category__c` (Picklist: Eligibility, Financials, Metrics, Compliance)<br>• `Sort_Order__c` (Number) |
| 13 | Multilingual Mirror Tables (`Translated_*`) | **Lookup** via `Proposal__c` | **Localized Multi-Language Mirrors**: Stores localized translations for non-English applications.<br>• `Translated_Proposal__c`<br>• `Translated_Historical_Data__c`<br>• `Translated_Current_Fiscal_Year_Data__c`<br>• `Translated_Outcome_Data__c`<br>• `Translated_Business_Sector__c`<br>• `Translated_Skilling_Domain__c` |

---

### 9.3. Custom Metadata Types (`__mdt`)
- **`RFI_Track__mdt`**: Configures available tracks (*Job Fulfillment, Job Creation, Livelihood Upliftment*), descriptions, and icon mappings.
- **`RFI_Section__mdt`**: Defines the 6 major intake sections and their sequential flow.
- **`RFI_Question__mdt`**: Master metadata for questions Q1–Q28 (Field API types, validation regex, help text, track dependencies).
- **`RFI_Validation_Rule__mdt` & `RFI_Dependency_Rule__mdt`**: Conditional visibility rules and multi-field validation constraints.
- **`RFI_Translation__mdt`**: Multi-lingual label and prompt dictionary for Spanish, French, Portuguese, and Hindi.
- **`Validator_Section__mdt` & `Validator_Question__mdt`**: 5 screening sections and quantitative checklist criteria.
- **`Reviewer_Category_v5__mdt`**: 7 qualitative evaluation categories with relative percentage weights.
- **`Reviewer_Question_v5__mdt`**: 22 qualitative evaluation criteria with 5-point scoring rubrics.
- **`Country_State_Mapping__mdt`**: Hierarchical country-to-state dropdown dependencies.
- **`Form_Label__mdt`**: Dynamic UI labels and portal guidance messages.

---

## 10. Email Templates & Notification Matrix (36+ Templates & In-Flow Text Templates)

The system utilizes **36 core email templates** housed under `email/WCF_Folder/` combined with **6 in-flow rich HTML text templates**:

### 10.1. Comprehensive Master Email Template Catalog

| # | Developer Name | UI Label | Subject Line | Recipient Persona | Triggering Mechanism / Flow | Business Event & SLA |
|---|---|---|---|---|---|---|
| 1 | `Application_Received` | Application Received | Your Wadhwani Grants application has been received | Applicant | `Wadhwani_Grants_Email` | Sent immediately upon initial proposal submission. |
| 2 | `Draft_Saved` | Draft Saved | Your Wadhwani Grants application: draft saved | Applicant | `Wadhwani_Grants_Email` | Sent when applicant saves draft application for the first time. |
| 3 | `New_Application_Validator_Queue` | New Application Validator Queue | [Action Needed] New Proposal Submitted for Screening | Validator Queue | `Wadhwani_Grants_Email` | Alerts Validator team that a new proposal is pending screening. |
| 4 | `Validation_Due_Soon` | Validation Due Soon | [Reminder] Proposal Screening Due Soon | Validator Queue | `Wadhwani_Grants_Email` | 3-day reminder before validator 10-day SLA expires. |
| 5 | `Action_Required_Update_Application` | Action Required Update Application | Action required: update your Wadhwani Grants application | Applicant | `Wadhwani_Grants_Email` | Fired when Validator returns proposal with consolidated question feedback. |
| 6 | `Resubmission_Received_Partner` | Resubmission Received Partner | Your resubmitted Wadhwani Grants application has been received | Applicant | `Wadhwani_Grants_Email` | Confirms receipt of revised proposal submission. |
| 7 | `Additional_Information_Requested` | Additional Information Requested | [Org Name] Additional information requested | Validator / Applicant | `Wadhwani_Grants_Email` | Fired when Reviewer returns application requesting further clarifications (E-48). |
| 8 | `Additional_Information_Reminder` | Additional Information Reminder | [Reminder] [Org Name] Additional information requested | Applicant | `Wadhwani_Grants_Email` | 30-day scheduled reminder if revisions remain pending. |
| 9 | `Additional_Information_Reminder_30day` | Additional Information Reminder- 30day | {!Org Name} Your application is waiting for your updates | Applicant | Scheduled Flow | 30-day milestone revision reminder. |
| 10 | `Additional_Information_Reminder_60days` | Additional Information Reminder- 60days | {!Org Name} Your application is waiting for your updates | Applicant | Scheduled Flow | 60-day milestone revision reminder. |
| 11 | `Additional_Information_Reminder_90days` | Additional Information Reminder- 90days | {!Org Name} Your application is waiting for your updates | Applicant | Scheduled Flow | 90-day final warning revision reminder. |
| 12 | `We_are_closing_your_application_for_now` | We are closing your application for now | We are closing your application for now | Applicant | `Wadhwani_Grants_Email` | 100-day automated application closure due to applicant inactivity. |
| 13 | `Application_Validated_Under_Review` | Application Validated Under Review | Your Wadhwani Grants application is now being reviewed | Applicant | `Wadhwani_Grants_Email` | Fired when Validator approves screening and routes to reviewers. |
| 14 | `Information_Located_Review_Can_Resume` | Information Located Review Can Resume | Information located, review can resume | Reviewer | `Wadhwani_Grants_Email` | Alerts Reviewer that applicant has furnished requested clarifications (E-49). |
| 15 | `Approver_Further_Detail_Request_PL` | Approver Further Detail Request PL | {{{org_name}}} — Approver requests further detail | Reviewer / PL | `Wadhwani_Grants_Email` | Approver returns proposal back to reviewer for technical clarification (E-51). |
| 16 | `Application_Approved` | Application Approved | Your Wadhwani Grants application is approved | Applicant | `Wadhwani_Grants_Email` | Official grant committee approval notice with onboarding instructions. |
| 17 | `Application_Decision_Declined` | Application Decision Declined | Your Wadhwani Grants application was NOT approved | Applicant | `Wadhwani_Grants_Email` | Formal decline notification with feedback. |
| 18 | `Application_Conditionally_Approved` | Application Conditionally Approved | [{!Org Name}] Wadhwani Grants application conditionally approved | Applicant | Decision Flow | Formal conditional approval subject to stipulations. |
| 19 | `Compliance_Documents_Requested` | Compliance Documents Requested | Your Wadhwani Grants onboarding: documents needed | Applicant | `WF_Compliance_Document_flow` | Dispatches initial compliance document request checklist (E-12). |
| 20 | `Compliance_your_document_upload_has_started` | Compliance - your document upload has started | Your compliance document upload is saved | Applicant | `WF_Compliance_Document_flow` | Sent when applicant uploads initial draft compliance certificate (E-62). |
| 21 | `We_have_received_your_compliance_documents` | We have received your compliance documents | We have received your compliance documents | Applicant | `WF_Compliance_Document_flow` | Confirms receipt of full compliance file submission (E-25). |
| 22 | `Compliance_documents_submitted_for_review` | Compliance documents submitted for review | Compliance documents submitted - your review is needed | Reviewer / Staff | `WF_Compliance_Document_flow` | Alerts Compliance Lead that partner has submitted compliance files. |
| 23 | `Compliance_Revision_Requested` | Compliance Revision Requested | Action required: compliance document updates | Applicant | `WF_Compliance_Document_flow` | Fired when compliance officer rejects an expired/invalid certificate (E-24). |
| 24 | `Compliance_Documents_Reminder` | Compliance Documents Reminder | [Reminder] [Org Name] Compliance documents requested | Applicant | `WF_Compliance_Document_flow` | Periodic compliance checklist submission reminder. |
| 25 | `Compliance_Documents_Reminder_30_days` | Compliance Documents Reminder 30 days | [Reminder] We are still waiting for your compliance documents | Applicant | `WF_Compliance_Document_flow` | 30-day compliance document submission reminder (E-56). |
| 26 | `Compliance_Documents_Reminder_60_days` | Compliance Documents Reminder 60 days | [Reminder] We are still waiting for your compliance documents | Applicant | `WF_Compliance_Document_flow` | 60-day compliance document escalation reminder (E-56). |
| 27 | `Compliance_Documents_Reminder_90_days` | Compliance Documents Reminder 90 days | [Reminder] We are still waiting for your compliance documents | Applicant | `WF_Compliance_Document_flow` | 90-day final compliance warning reminder (E-56). |
| 28 | `Your_account_is_suspended` | Your account is suspended | Account suspended on compliance | Applicant | `WF_Compliance_Document_flow` | Sent when partner fails to submit compliance within 100 days (E-59). |
| 29 | `We_have_paused_your_onboarding` | We have paused your onboarding | We have paused your onboarding | Applicant | `WF_Compliance_Document_flow` | Administrative onboarding pause notification. |
| 30 | `Compliance_Documents_Approved` | Compliance Documents Approved | Your compliance documents are approved | Applicant | `WF_Compliance_Document_flow` | Fired when all compliance documents reach `Validated` (E-63). |
| 31 | `Onboarding_Complete_Partner` | Onboarding Complete Partner | Your onboarding with Wadhwani Grants is complete | Applicant | `WCFComplianceDocumentTrigger` | Final onboarding milestone completion notice. |
| 32 | `Master_MoU_Renewal_Reminder` | Master MoU Renewal Reminder | [Reminder] Master MoU Expiring Soon | Applicant | Scheduled Compliance | 60-day notice prior to Master MoU expiration. |
| 33 | `Master_MoU_Renewal_Reminder_Mail` | Master MoU Renewal Reminder Mail | Master MoU Renewal Notice | Applicant | Scheduled Compliance | Milestone MoU renewal notification. |
| 34 | `Compliance_Document_Expiry` | Compliance Document Expiry | [{{org_name}}] A compliance document is expiring soon | Applicant | Scheduled Compliance | 30-day notice before FCRA / 80G certificate expires. |
| 35 | `Decision_Recorded_PL_Alert` | Decision Recorded PL Alert | {{{org_name}}} — decision recorded: {{{decision_outcome}}} | Programme Lead | Decision Alert | Alerts Programme Lead when executive committee finalizes decision. |
| 36 | `Welcome_to_Wadhwani_Grants_your_account_is_ready` | Welcome to Wadhwani Grants | Welcome to Wadhwani Grants: your account is ready | Applicant | Self-Registration | Sent upon successful public registration and Community User activation. |

---

### 10.2. In-Flow Rich HTML Text Templates Matrix

| Flow Name | Text Template Name | Action Name | Recipient Persona | Purpose & Content |
|---|---|---|---|---|
| `Reviewer_Email_Alert_Wadhwani_Grants` | `New_Evaluation_Assinged` | `New_Evaluation_Template` | Reviewer | Dispatches review assignment notification, application summary, 10-day SLA deadline, and direct portal link. |
| `Reviewer_Email_Alert_Wadhwani_Grants` | `EvaluationDueSoon` | `Due_Date_Reminder_Alert` | Reviewer | Scheduled reminder fired 3 working days before review `DueDate`. |
| `Reviewer_Email_Alert_Wadhwani_Grants` | `Passed_toreview` | `Mail_to_Reviewer_at_Passed` | Reviewer | Alerts reviewer that the application was passed by validator with a flagged concern (`Flagged__c = true`). |
| `WCF_Application_Decision_Flow` | `DecisionRecorded` | `Decision_Email_to_Reviewer` | Reviewer | Notifies assigned reviewer that executive committee has recorded the final funding decision (Accept / Reject). |
| `WCF_Approver_Email_Alert_Flow` | `Approver_ReadyForDecision` | `Ready_for_Decision_Email_Alert` | Approver | Alerts Approver that all reviewer evaluations are complete and proposal is ready for decision. |
| `WCF_Approver_Email_Alert_Flow` | `DeclineRecommended_Email` | `Decline_Recommended_Email` | Approver | Alerts Approver that reviewer has submitted evaluation recommending decline with justification. |
| `WCF_Approver_Email_Alert_Flow` | `Overdue_decision` | `Decision_OVerdue_Email` | Approver | Escalation notice sent to Approver when funding decision SLA is breached. |

---

## 11. Third-Party Integrations & External Systems

### 11.1. OpenStreetMap Nominatim Geocoding API
- **Service**: `OpenStreetMapService.cls`
- **Endpoint**: `https://nominatim.openstreetmap.org/search`
- **Functionality**: Provides real-time address autocomplete and HQ coordinates validation during RFI intake without external Google Maps API licensing costs.

### 11.2. Einstein GenAI Automated Proposal Scoring
- **Invocable Action**: `ProposalAIUpdater_WCF.cls`
- **Prompt Templates**: `Proposal_AI_Feedback_Update_Prompt`, `Grant_Field_Feedback_Template`
- **Functionality**: Analyzes proposal text responses, calculates automated governance/impact ratings, and identifies key operational strengths and risks.

---

## 12. Operations, Admin Guide & Troubleshooting Manual

### 12.1. Managing User Roles & Access
To grant a user Validator, Reviewer, or Approver access:
1. Open the user's **Person Account** record.
2. Check the appropriate role checkbox:
   - `WCFs_Validator__c = true` ➔ Validator Portal Access
   - `WCF_Reviewer__c = true` ➔ Reviewer Portal Access
   - `WCF_Approver__c = true` ➔ Approver Portal Access
3. The server-side controller `WCFDashboardAccessController.cls` immediately reflects the updated permissions on the user's next session.

### 12.2. Common Troubleshooting Scenarios

| Issue / Symptom | Root Cause | Resolution Steps |
|---|---|---|
| Applicant cannot edit returned application | Proposal `Status` is not set to `Revision Requested` | Check `ApplicationReview.Status` and ensure Validator decision was set to `Return`. |
| Proposal does not move to `Onboarded` | Not all mandatory compliance documents are marked `Validated` | Open `wcfComplianceDocuments` and verify all required documents have `Status__c = 'Validated'`. |
| Reviewer cannot view assigned application | Reviewer Contact ID mismatch or missing Account flag | Verify `Account.WCF_Reviewer__c = true` and `ApplicationReview.Contact__c` matches the logged-in user. |
| Approver cannot record decision | Decision comment or rejection reasons not filled | When rejecting, select at least one rejection reason tile and provide decision comments. |

---

*Document compiled and verified against Sandbox Metadata.*
