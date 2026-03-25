# Club Management Module Architecture (Enterprise Edition)

This diagram illustrates the core entities and their relationships within the Club Management module, featuring enterprise-grade hardware identity management.

```mermaid
classDiagram
    direction LR

    class Tenant {
        +UUID _id
        +String name
        +String subdomain
        +JSONB activeModules
    }

    class User {
        +UUID _id
        +String email
        +DateTime membershipExpiresAt
        +Enum membershipStatus
        +UUID membershipTierId
    }

    class HardwareToken {
        +UUID _id
        +String tokenValue
        +Enum type
        +Enum status
        +DateTime issuedAt
        +DateTime deactivatedAt
        +UUID userId
    }

    class MembershipTier {
        +UUID _id
        +String name
        +Float price
        +Integer durationDays
    }

    class Wallet {
        +UUID _id
        +Float balance
        +UUID userId
    }

    class Transaction {
        +UUID _id
        +Float amount
        +Enum type
        +UUID walletId
    }

    class CommissionLedger {
        +UUID _id
        +Float amount
        +Float coachShare
        +Float clubShare
        +Enum status
        +UUID transactionId
        +UUID coachId
    }

    class Order {
        +UUID _id
        +Float totalAmount
        +UUID walletId
    }

    class Product {
        +UUID _id
        +String name
        +Float price
    }

    class Resource {
        +UUID _id
        +String name
        +Enum type
    }

    class IotDevice {
        +UUID _id
        +String name
        +Enum type
        +Enum status
    }

    class Booking {
        +UUID _id
        +DateTime startTime
        +DateTime endTime
        +UUID userId
        +UUID resourceId
    }

    class AccessLog {
        +UUID _id
        +DateTime timestamp
        +Enum status
        +UUID userId
        +UUID deviceId
        +UUID hardwareTokenId
        +UUID resourceId
    }

    class EmployeeProfile {
        +UUID _id
        +Enum staffType
        +Float commissionRate
        +UUID userId
    }

    Tenant "1" -- "*" User : has
    Tenant "1" -- "*" MembershipTier : defines
    Tenant "1" -- "*" IotDevice : owns
    Tenant "1" -- "*" Resource : owns
    
    User "*" -- "1" MembershipTier : belongs to
    User "1" -- "1" Wallet : owns
    User "1" -- "0..1" EmployeeProfile : as
    User "1" -- "*" HardwareToken : has multiple
    User "1" -- "*" Booking : makes
    User "1" -- "*" AccessLog : generates
    
    HardwareToken "1" -- "*" AccessLog : used in
    
    Wallet "1" -- "*" Transaction : logs
    Wallet "1" -- "*" Order : pays for
    
    Transaction "1" -- "0..1" CommissionLedger : generates
    EmployeeProfile "1" -- "*" CommissionLedger : earns
    
    Booking "*" -- "1" Resource : reserves
    AccessLog "*" -- "0..1" IotDevice : via (Hardware)
    AccessLog "*" -- "0..1" Resource : at (Bookable)
```

## Fixes Applied

1.  **Enterprise Hardware Identity**: Replaced the single `rfidCardNumber` on `User` with a dedicated `HardwareToken` table. This allows members to have multiple tokens over time (LOST, REVOKED, ACTIVE) while preserving historical access logs.
2.  **Membership Lifecycle**: `membershipStatus` and `membershipExpiresAt` track the validity of the member's access.
3.  **Coach Commissions**: `CommissionLedger` automates the fee splitting for trainers and staff.
4.  **Physical Separation**: `IotDevice` (hardware) is separate from `Resource` (bookable events).

