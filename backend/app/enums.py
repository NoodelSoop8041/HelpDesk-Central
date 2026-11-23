from enum import Enum


class TicketPriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class TicketStatus(str, Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"


class AssetStatus(str, Enum):
    AVAILABLE = "Available"
    ASSIGNED = "Assigned"
    IN_REPAIR = "In Repair"
    RETIRED = "Retired"
