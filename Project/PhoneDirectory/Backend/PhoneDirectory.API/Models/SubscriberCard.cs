using System.Text.Json.Serialization;

namespace PhoneDirectory.API.Models
{
    public class SubscriberCard
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Position { get; set; }
        public string? Department { get; set; }
        public string? Building { get; set; }
        public string? OfficeNumber { get; set; }
        public string? InternalPhone { get; set; }
        public string? CityPhone { get; set; }
        public string? MobilePhone { get; set; }
        public string? Email { get; set; }
    
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Навигационные свойства
        [JsonIgnore]
        public User? User { get; set; }
        
        [JsonIgnore]
        public ICollection<ContactInfo> ContactInfos { get; set; } = new List<ContactInfo>();
    }
    
    public class ContactType
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
        
        [JsonIgnore]
        public ICollection<ContactInfo> ContactInfos { get; set; } = new List<ContactInfo>();
    }
    
    public class ContactInfo
    {
        public int Id { get; set; }
        public int SubscriberCardId { get; set; }
        public int ContactTypeId { get; set; }
        public string Value { get; set; } = string.Empty;
        public bool IsPrimary { get; set; } = false;
        
        // Навигационные свойства
        [JsonIgnore]
        public SubscriberCard? SubscriberCard { get; set; }
        
        [JsonIgnore]
        public ContactType? ContactType { get; set; }
    }
}