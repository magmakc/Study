using Microsoft.EntityFrameworkCore;
using PhoneDirectory.API.Models;

namespace PhoneDirectory.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }
        
        public DbSet<User> Users { get; set; }
        public DbSet<SubscriberCard> SubscriberCards { get; set; }
        public DbSet<ContactType> ContactTypes { get; set; }
        public DbSet<ContactInfo> ContactInfos { get; set; }
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Конфигурация User
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasIndex(u => u.Username).IsUnique();
                entity.HasIndex(u => u.Email).IsUnique();
                entity.Property(u => u.Role).HasDefaultValue("Subscriber");
                entity.Property(u => u.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });
            
            // Конфигурация SubscriberCard
            modelBuilder.Entity<SubscriberCard>(entity =>
            {
                entity.HasIndex(e => e.UserId).IsUnique();
                entity.HasOne(e => e.User)
                    .WithOne(u => u.SubscriberCard)
                    .HasForeignKey<SubscriberCard>(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });
            
            // Конфигурация ContactType
            modelBuilder.Entity<ContactType>(entity =>
            {
                entity.HasIndex(c => c.Name).IsUnique();
                entity.Property(c => c.IsActive).HasDefaultValue(true);
            });
            
            // Конфигурация ContactInfo
            modelBuilder.Entity<ContactInfo>(entity =>
            {
                entity.HasOne(e => e.SubscriberCard)
                    .WithMany(s => s.ContactInfos)
                    .HasForeignKey(e => e.SubscriberCardId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne(e => e.ContactType)
                    .WithMany(c => c.ContactInfos)
                    .HasForeignKey(e => e.ContactTypeId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}