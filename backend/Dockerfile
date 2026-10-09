FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY src/GuiaGastronomico.Api/GuiaGastronomico.Api.csproj src/GuiaGastronomico.Api/
RUN dotnet restore src/GuiaGastronomico.Api/GuiaGastronomico.Api.csproj
COPY . .
RUN dotnet publish src/GuiaGastronomico.Api/GuiaGastronomico.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
# O Render injeta $PORT (a API precisa escutar nela); local/docker-compose cai em 8080.
CMD ASPNETCORE_URLS=http://+:${PORT:-8080} dotnet GuiaGastronomico.Api.dll
