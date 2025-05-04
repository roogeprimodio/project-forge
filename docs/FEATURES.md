# Project Forge - Screens and Features

This document outlines the current screens in the Project Forge application and suggests potential features for future development.

## Current Screens

1.  **Dashboard (`/`)**:
    *   Displays a list of existing projects (`ProjectList` component).
    *   Allows users to create a new project via the "Create New Project" button.
    *   Allows users to delete existing projects with confirmation.
    *   Provides links to edit each project.

2.  **Project Editor (`/project/[projectId]`)**:
    *   Displays the main editor interface (`ProjectEditor` component).
    *   Features a collapsible sidebar for navigation.
    *   **Sidebar Sections:**
        *   **Project Details:** Allows editing the Project Title, Team Details, and College Information.
        *   **Sections List:** Lists all sections currently in the project. Clicking a section loads it in the main editor area.
        *   **Add Standard Section:** Buttons to quickly add common predefined sections (e.g., Introduction, Conclusion) if they don't already exist.
        *   **Add Custom Section:** Input field and button to add a new section with a custom name.
    *   **Main Content Area:**
        *   Displays either the "Project Details" form or the editor for the currently selected section.
        *   **Section Editor:**
            *   Shows the section title.
            *   Provides a `Textarea` for the AI generation prompt specific to that section.
            *   Includes a "Generate Content" button (with loading state) to trigger the AI generation (`generateSectionAction`).
            *   Provides a `Textarea` for the main content of the section, allowing manual editing or viewing generated content.
            *   Displays the last generated timestamp if available.
    *   Includes a "Back" button to return to the Dashboard.

## Implemented Core Functionality

*   **Project Creation:** Clicking "Create New Project" generates a new project, saves it to local storage, and navigates to the editor.
*   **Project Deletion:** Clicking the trash icon on a project card prompts for confirmation and removes the project from local storage, showing a confirmation toast.
*   **Routing:** Navigation between the dashboard and project editor pages is functional using Next.js App Router and `next/link`.
*   **Section Management:** Adding standard/custom sections, editing section prompts and content is implemented.
*   **AI Content Generation:** Generating content for a specific section using the defined prompt and project details is functional via a server action (`generateSectionAction`).
*   **Local Storage Persistence:** Project data is saved in the browser's local storage.
*   **Basic UI:** Uses ShadCN UI components and Tailwind CSS for styling, including a responsive sidebar.

## Suggested Future Features & Enhancements

### Core AI Functionality

1.  **Report Export/Download:**
    *   Allow users to compile all sections and download the complete report.
    *   Offer formats like Markdown, PDF, DOCX.
    *   Include options for basic formatting (page numbers, title page based on project details).
2.  **AI-Powered Summarization:**
    *   Add a button in `ProjectEditor` (perhaps per section or globally) to summarize content.
    *   Utilize the `summarize-report-section` flow.
3.  **AI-Powered Table of Contents:**
    *   Add a button (likely in the main header or Project Details section) to generate a ToC based on existing section names.
    *   Utilize the `generate-table-of-contents` flow.
4.  **Advanced AI Configuration:**
    *   Allow users to select different AI models (if available via Genkit setup).
    *   Add options to adjust generation parameters (e.g., creativity, length - if supported by the model/prompt).
    *   Potentially allow users to provide their own API keys.
5.  **Image Generation/Handling:**
    *   Allow inserting images into sections (upload or via URL).
    *   Integrate AI image generation based on prompts relevant to the section. (Requires `gemini-2.0-flash-exp` or similar model).

### Editor & UX Improvements

6.  **Section Reordering:** Allow users to drag and drop sections in the sidebar to change their order in the final report.
7.  **Rich Text Editing:** Replace plain `Textarea` for section content with a basic rich text editor (e.g., Markdown editor or a simple WYSIWYG) for formatting.
8.  **Version History:**
    *   Keep track of previously generated content for each section.
    *   Allow users to view and revert to older versions.
9.  **Templates:**
    *   Offer predefined project report structures/templates (e.g., IEEE format, standard thesis).
    *   Automatically create sections based on the selected template.
10. **Improved State Management:** Consider a more robust state management solution if the app grows complex (though `useLocalStorage` is fine for now).
11. **Real-time Saving Indicator:** While changes save automatically, a clearer indicator (e.g., "Saving..." -> "Saved") could improve user confidence.

### Collaboration & Data Management

12. **User Authentication:**
    *   Implement user sign-up/login (e.g., using Firebase Auth).
    *   Store projects per user in a database (like Firestore) instead of local storage.
13. **Collaboration:**
    *   Allow multiple users to be invited to a project.
    *   Implement real-time collaboration features (requires database and potentially WebSockets).

### Quality & Polish

14. **Citation Management:**
    *   Basic tool to add and format citations/references.
    *   Potential integration with Zotero, Mendeley APIs.
15. **Plagiarism Check:**
    *   Integrate an external plagiarism detection API.
16. **Error Handling:** Enhance error reporting and user feedback for AI generation failures.
17. **Accessibility Audit:** Perform a thorough accessibility review and implement improvements.
18. **Theming:** Allow users to switch between light/dark themes (basic structure exists).
