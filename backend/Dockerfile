FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/GuiaGastronomico.Api/GuiaGastronomico.Api.csproj src/GuiaGastronomico.Api/
RUN dotnet restore src/GuiaGastronomico.Api/GuiaGastronomico.Api.csproj
COPY . .
RUN dotnet publish src/GuiaGastronomico.Api/GuiaGastronomico.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "GuiaGastronomico.Api.dll"]
