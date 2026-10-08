using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GuiaGastronomico.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRestaurantPhotos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PhotoUrl",
                table: "Restaurants");

            migrationBuilder.AddColumn<string>(
                name: "Photos",
                table: "Restaurants",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Photos",
                table: "Restaurants");

            migrationBuilder.AddColumn<string>(
                name: "PhotoUrl",
                table: "Restaurants",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);
        }
    }
}
