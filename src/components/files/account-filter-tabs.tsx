import { Badge } from "@/components/ui/badge";

interface AccountFilterTabsProps {
  accountEmails: string[];
  accountFilter: string | "all";
  onFilterChange: (filter: string | "all") => void;
}

export function AccountFilterTabs({
  accountEmails,
  accountFilter,
  onFilterChange,
}: AccountFilterTabsProps) {
  if (accountEmails.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge
        className="cursor-pointer"
        variant={accountFilter === "all" ? "default" : "outline"}
        onClick={() => onFilterChange("all")}
      >
        All Accounts
      </Badge>
      {accountEmails.map((email) => (
        <Badge
          key={email}
          className="cursor-pointer"
          variant={accountFilter === email ? "default" : "outline"}
          onClick={() => onFilterChange(email)}
        >
          {email}
        </Badge>
      ))}
    </div>
  );
}
