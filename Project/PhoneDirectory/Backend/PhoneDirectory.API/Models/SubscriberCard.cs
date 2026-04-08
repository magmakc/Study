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
        public DateTime? HireDate { get; set; } // Дата приема на работу

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Вычисляемое свойство: стаж работы
        [JsonIgnore]
        public string WorkExperience
        {
            get
            {
                if (!HireDate.HasValue)
                    return "Не указан";

                var now = DateTime.Today;
                var hireDate = HireDate.Value.Date;

                if (hireDate > now)
                    return "Дата в будущем";

                var years = now.Year - hireDate.Year;
                var months = now.Month - hireDate.Month;

                // Корректировка, если день месяца еще не наступил
                if (now.Day < hireDate.Day)
                {
                    months--;
                }

                // Корректировка года, если месяцы отрицательные
                if (months < 0)
                {
                    years--;
                    months += 12;
                }

                // Форматирование с учетом склонения
                string yearsText = FormatYears(years);
                string monthsText = FormatMonths(months);

                if (years > 0)
                {
                    return months > 0 ? $"{yearsText} {monthsText}" : yearsText;
                }
                else if (months > 0)
                {
                    return monthsText;
                }
                else
                {
                    return "Менее месяца";
                }
            }
        }

        private string FormatYears(int years)
        {
            if (years == 0) return "";
            
            int lastTwoDigits = years % 100;
            int lastDigit = years % 10;

            string word;
            if (lastTwoDigits >= 11 && lastTwoDigits <= 14)
            {
                word = "лет";
            }
            else if (lastDigit == 1)
            {
                word = "год";
            }
            else if (lastDigit >= 2 && lastDigit <= 4)
            {
                word = "года";
            }
            else
            {
                word = "лет";
            }

            return $"{years} {word}";
        }

        private string FormatMonths(int months)
        {
            if (months == 0) return "";
            
            int lastTwoDigits = months % 100;
            int lastDigit = months % 10;

            string word;
            if (lastTwoDigits >= 11 && lastTwoDigits <= 14)
            {
                word = "месяцев";
            }
            else if (lastDigit == 1)
            {
                word = "месяц";
            }
            else if (lastDigit >= 2 && lastDigit <= 4)
            {
                word = "месяца";
            }
            else
            {
                word = "месяцев";
            }

            return $"{months} {word}";
        }

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