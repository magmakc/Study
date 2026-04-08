using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PhoneDirectory.API.Migrations
{
    /// <inheritdoc />
    public partial class AddHireDateField : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "HireDate",
                table: "SubscriberCards",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HireDate",
                table: "SubscriberCards");
        }
    }
}
