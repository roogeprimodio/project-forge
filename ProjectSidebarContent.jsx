
// Inside ProjectSidebarContent component

<ScrollArea className="flex-1 px-2 py-2 overflow-x-auto"> {/* Add overflow-x-auto here */}
 <nav className="flex flex-col gap-1 whitespace-nowrap"> {/* Add whitespace-nowrap here */}
    {/* ... buttons and HierarchicalSectionItems ... */}
    {/* Ensure text spans within HierarchicalSectionItem also handle potential overflow, e.g., with truncate */}
 </nav>
</ScrollArea>
    