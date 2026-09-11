# Redesign Plan: Dynamic Metadata-Driven RFI Form Engine (LWC & Apex)

> [!NOTE]
> Detailed technical implementation plan for replacing static LWC/Apex RFI form logic with a dynamic metadata-driven form engine.

---

## Overview & Confirmed Design Architecture

Following user review and validation against existing codebase components (`wcfApplicantDashboard`, `wcfApplicantWelcomeDashboard`, `wcfRfiWelcomePage`, `wcfForm`, and `WCFFormController`), the design choices are aligned as follows:

1. **Multi-Select Track Selection & Data Model**:
   - Applicant track choices (e.g., `JOB_FULFILLMENT`, `JOB_CREATION`, `LIVELIHOOD`) will be saved on a single unified Record Type on `IndividualApplication` (Label: *Proposal*).
   - Selected track codes will be stored as a semicolon-delimited string (or multi-select picklist) in `Selected_Funding_Tracks__c` (e.g., `"JOB_FULFILLMENT;JOB_CREATION"`).

2. **Admin Metadata Management Interface**:
   - Configuration managed via standard **Custom Metadata Types (CMDT)** (`RFI_Track__mdt`, `RFI_Section__mdt`, `RFI_Question__mdt`, `RFI_Dependency_Rule__mdt`, `RFI_Validation_Rule__mdt`, `RFI_Translation__mdt`).
   - Custom Metadata ensures deployment safety between Sandboxes and Production environments.

3. **Translation Approach**:
   - Question labels, help text, placeholders, picklist translations, and section descriptions are stored in `RFI_Translation__mdt`.
   - Fixed UI controls (e.g. *Next*, *Previous*, *Save Draft*, *Submit*) continue to leverage standard Salesforce Custom Labels (`System.Label`).

4. **Dynamic Historical Financial Years Calculation**:
   - Historical financial years (Current Fiscal Year, FY-1, FY-2, FY-3) are computed dynamically per applicant organization using `Fiscal_Month__c` and `Fiscal_Day__c` on the Account record.

5. **Data Model Mapping**:
   - Form values map dynamically to `IndividualApplication` (Proposal) and its related objects:
     - `Historical_Data__c` (Historical financials)
     - `Current_fiscal_year_data__c` (Current FY budget/projections)
     - `Outcomes_Data__c` (Historical & projected outcomes)
     - `WCF_Skilling_Domain__c` (Skilling domains selected)
     - `WCF_Business_Sector__c` (Business sectors selected)

6. **End-to-End Component Lifecycle**:
   - **`wcfApplicantDashboard`**: Primary shell. Manages applicant lifecycle state (`NotStarted`, `Draft`, `Submitted`, `RevisionRequested`, `UnderReview`, `Approved`, `Decided`).
   - **`wcfApplicantWelcomeDashboard`** (incorporating `wcfRfiWelcomePage`): Onboarding welcome screen for `NotStarted` applications with preparation checklist and "Begin Application" action.
   - **`wcfForm`** (or inner `c-wcf-dynamic-form` engine): Dynamic form container rendering metadata-driven sections, questions, grids, track dependencies, and payload submission.

---

## Architectural Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Experience Cloud Site (LWC)                           │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                          wcfApplicantDashboard                            │  │
│  │      (State Manager: NotStarted / Draft / Submitted / Revision / Approved)│  │
│  └───────┬───────────────────────────────────────────────────────────┬───────┘  │
│          │                                                           │          │
│          ▼ (NotStarted)                                              ▼ (Draft/Edit)
│  ┌─────────────────────────────────────────┐               ┌─────────────────┐  │
│  │      wcfApplicantWelcomeDashboard       │               │     wcfForm     │  │
│  │        (wcfRfiWelcomePage)              │               │(c-wcf-dynamic-  │  │
│  └─────────────────────────────────────────┘               │     form)       │  │
│                                                            └────────┬────────┘  │
│                                                                     │           │
│         ┌───────────────────────────────────────────────────────────┴────────┐  │
│         ▼                                                                    ▼  │
│  ┌──────────────────────────────┐                         ┌───────────────────┐ │
│  │   c-wcf-dynamic-section      │                         │wcfFormEvaluator.js│ │
│  │   (Renders filtered sections)│                         │(Math, Dependency &│ │
│  └──────────────┬───────────────┘                         │ Validation Rules) │ │
│                 │                                         └───────────────────┘ │
│                 ▼                                                               │
│  ┌──────────────────────────────┐                                               │
│  │   c-wcf-dynamic-question     │                                               │
│  │ (Polymorphic field renderer) │                                               │
│  └──────────────┬───────────────┘                                               │
│                 ├───────────────────────┬────────────────────────┐              │
│                 ▼                       ▼                        ▼              │
│     ┌───────────────────────┐ ┌───────────────────┐ ┌─────────────────┐         │
│     │ c-wcf-financial-grid  │ │c-wcf-file-uploader│ │c-wcf-rich-editor│         │
│     └───────────────────────┘ └───────────────────┘ └─────────────────┘         │
└────────────────────────────────────┬────────────────────────────────────────────┘
                                     │ Apex AuraEnabled API
┌────────────────────────────────────▼────────────────────────────────────────────┐
│                           Salesforce Core Apex Layer                            │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                 WCFFormMetadataController                               │   │
│   │   (Loads Custom Metadata configuration & translations by language code)  │   │
│   └────────────────────────────────┬────────────────────────────────────────┘   │
│                                    │                                            │
│   ┌────────────────────────────────▼────────────────────────────────────────┐   │
│   │                 WCFFormEngineController / WCFFormController             │   │
│   │   (Dynamic payload parser, DB persistence across IndividualApplication,  │   │
│   │    Historical_Data__c, Current_fiscal_year_data__c, Outcomes_Data__c,   │   │
│   │    WCF_Skilling_Domain__c & WCF_Business_Sector__c)                     │   │
│   └────────────────────────────────┬────────────────────────────────────────┘   │
│                                    │                                            │
│   ┌────────────────────────────────▼────────────────────────────────────────┐   │
│   │                 WCFFormFiscalYearUtil                                   │   │
│   │   (Computes CFY, FY-1, FY-2, FY-3 labels using Fiscal_Month/Day)        │   │
│   └────────────────────────────────┬────────────────────────────────────────┘   │
│                                    │                                            │
│  ┌─────────────────────────────────┴────────────────────────────────────────┐  │
│  │                       Custom Metadata Types (CMDT)                       │  │
│  │ ── RFI_Track__mdt               ── RFI_Section__mdt                      │  │
│  │ ── RFI_Question__mdt            ── RFI_Dependency_Rule__mdt              │  │
│  │ ── RFI_Validation_Rule__mdt     ── RFI_Translation__mdt                  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Proposed Changes

### Component 1: Custom Metadata Types Schema

#### [NEW] Custom Metadata Types Definitions
1. **`RFI_Track__mdt`**:
   - `Track_Code__c` (Text, Unique Key e.g., `JOB_FULFILLMENT`, `JOB_CREATION`, `LIVELIHOOD`)
   - `MasterLabel` / `Label_Translation_Key__c`
   - `Sequence__c` (Number)
   - `Description_Key__c` (Text)
   - `Is_Active__c` (Checkbox)

2. **`RFI_Section__mdt`**:
   - `Section_Code__c` (Text, Unique Key e.g., `SEC_ABOUT_ORG`, `SEC_WHAT_YOU_DO`, `SEC_OUTCOMES`, `SEC_WHY_WCF`, `SEC_REVIEW_SUBMIT`)
   - `Sequence__c` (Number)
   - `Title_Translation_Key__c` (Text)
   - `Description_Translation_Key__c` (Text)
   - `Applicable_Tracks__c` (Long Text / Comma-Separated Track Codes; blank means all tracks)

3. **`RFI_Question__mdt`**:
   - `Question_Key__c` (DeveloperName, e.g., `Q_ORG_NAME`, `Q_LEGAL_TYPE`, `Q_HIST_FINANCIALS`)
   - `RFI_Section__c` (Lookup/EntityDefinition to `RFI_Section__mdt`)
   - `Sequence__c` (Number)
   - `Display_Type__c` (Picklist: `Text`, `TextArea`, `RichText`, `Number`, `Currency`, `Date`, `Combobox`, `MultiSelect`, `Radio`, `FileUpload`, `FinancialGrid`, `OutcomeGrid`, `SkillingDomainGrid`, `BusinessSectorGrid`)
   - `Target_Object__c` (Text e.g. `IndividualApplication`, `Historical_Data__c`, `Current_fiscal_year_data__c`, `Outcomes_Data__c`, `WCF_Skilling_Domain__c`, `WCF_Business_Sector__c`)
   - `Target_Field__c` (Text e.g. `Organization_Name__c`)
   - `Label_Translation_Key__c` (Text)
   - `Help_Text_Translation_Key__c` (Text)
   - `Placeholder_Translation_Key__c` (Text)
   - `Is_Required__c` (Checkbox)
   - `Applicable_Tracks__c` (Text: Comma-Separated Track Codes)
   - `Picklist_Source__c` (Text e.g., `IndividualApplication.Legal_Type__c`)
   - `Max_Word_Count__c` (Number)

4. **`RFI_Dependency_Rule__mdt`**:
   - `Target_Question_Key__c` (Text)
   - `Source_Question_Key__c` (Text)
   - `Operator__c` (Picklist: `EQUALS`, `NOT_EQUALS`, `CONTAINS`, `IN`, `GREATER_THAN`, `NOT_BLANK`, `TRACK_INCLUDES`)
   - `Value__c` (Text e.g., `JOB_FULFILLMENT`, `Other`, `Yes`)
   - `Action__c` (Picklist: `SHOW`, `HIDE`, `REQUIRE`, `ENABLE`, `DISABLE`)

5. **`RFI_Translation__mdt`**:
   - `Translation_Key__c` (Text, Indexed)
   - `Language_Code__c` (Text e.g., `en_US`, `es`, `pt_BR`)
   - `Translated_Text__c` (Long Text)

---

### Component 2: Apex Backend Architecture

#### [NEW] [WCFFormFiscalYearUtil.cls](file:///c:/Users/WELCOME/Desktop/WCF/WCF/force-app/main/default/classes/WCFFormFiscalYearUtil.cls)
- Computes dynamic fiscal year date ranges and labels (CFY, FY-1, FY-2, FY-3) based on `Fiscal_Month__c` and `Fiscal_Day__c`.

#### [NEW] [WCFFormMetadataController.cls](file:///c:/Users/WELCOME/Desktop/WCF/WCF/force-app/main/default/classes/WCFFormMetadataController.cls)
- `@AuraEnabled(cacheable=true) getFormMetadata(String languageCode)`: Returns tracks, sections, questions, rules, and localized translations for the engine.

#### [NEW] [WCFFormEngineController.cls](file:///c:/Users/WELCOME/Desktop/WCF/WCF/force-app/main/default/classes/WCFFormEngineController.cls) / [MODIFY] [WCFFormController.cls](file:///c:/Users/WELCOME/Desktop/WCF/WCF/force-app/main/default/classes/WCFFormController.cls)
- Standardized methods to save draft and submit dynamic payload:
  - Updates `IndividualApplication` (Proposal) record with track codes in `Selected_Funding_Tracks__c`.
  - Maps payload entries to `Historical_Data__c`, `Current_fiscal_year_data__c`, `Outcomes_Data__c`, `WCF_Skilling_Domain__c`, and `WCF_Business_Sector__c`.
  - Performs server-side metadata validation before database commit.

---

### Component 3: LWC Form Engine & Dashboard Integration

#### [MODIFY] [wcfApplicantDashboard](file:///c:/Users/WELCOME/Desktop/WCF/WCF/force-app/main/default/lwc/wcfApplicantDashboard)
- Maintains overall status orchestration. When status is `NotStarted`, delegates to `wcfApplicantWelcomeDashboard`. When user clicks "Start Application" or "Resume", displays `wcfForm` in full-screen overlay.

#### [MODIFY] [wcfApplicantWelcomeDashboard](file:///c:/Users/WELCOME/Desktop/WCF/WCF/force-app/main/default/lwc/wcfApplicantWelcomeDashboard) & [wcfRfiWelcomePage](file:///c:/Users/WELCOME/Desktop/WCF/WCF/force-app/main/default/lwc/wcfRfiWelcomePage)
- Retains welcome instructions, language selector, preparation points, and triggers the `startapplication` event for `wcfApplicantDashboard`.

#### [NEW] [wcfDynamicForm](file:///c:/Users/WELCOME/Desktop/WCF/WCF/force-app/main/default/lwc/wcfDynamicForm) / [MODIFY] [wcfForm](file:///c:/Users/WELCOME/Desktop/WCF/WCF/force-app/main/default/lwc/wcfForm)
- Dynamic container replacing hardcoded sections. Renders active track cards in Section 1, dynamic stepper, dynamically filtered `c-wcf-dynamic-section` components, save draft / submit handlers, and auto-save.

#### [NEW] [wcfFormEvaluator.js](file:///c:/Users/WELCOME/Desktop/WCF/WCF/force-app/main/default/lwc/wcfFormEvaluator)
- Client-side JavaScript evaluation module for dependency rules (`TRACK_INCLUDES`, `EQUALS`, etc.), grid calculations, word counts, and required field validations.

---

## Verification Plan

### Automated Tests
1. **Apex Unit Tests**:
   - `WCFFormFiscalYearUtilTest.cls`: Verify FY calculation logic for various fiscal month/day combinations.
   - `WCFFormMetadataControllerTest.cls`: Verify metadata retrieval and language translation fallback.
   - `WCFFormEngineControllerTest.cls`: Verify dynamic draft saving and submission across `IndividualApplication` and child objects (`Historical_Data__c`, `Current_fiscal_year_data__c`, `Outcomes_Data__c`, `WCF_Skilling_Domain__c`, `WCF_Business_Sector__c`).
   - Target Coverage: ≥ 85%.

2. **LWC Jest Tests**:
   - `wcfFormEvaluator.test.js`: Test rule evaluation engine, track filtering, and math calculations.

### Manual Verification
1. **Dashboard Flow**:
   - Navigate to applicant dashboard as new user -> Verify welcome dashboard (`wcfApplicantWelcomeDashboard` & `wcfRfiWelcomePage`) displays.
   - Click "Begin Application" -> Verify dynamic form engine loads.
2. **Multi-Select Tracks & Dynamic Sections**:
   - Select `JOB_FULFILLMENT` & `JOB_CREATION` -> Verify corresponding dynamic questions display in Sections 2 and 3.
3. **Translation Switching**:
   - Switch language between `en_US`, `es`, `pt_BR` -> Verify question labels, help texts, and section titles update dynamically.
4. **Child Records Persistence**:
   - Fill Historical Data, Current FY Data, Outcomes, Skilling Domains, and Business Sectors -> Save Draft / Submit -> Verify records are correctly created under `IndividualApplication`.
