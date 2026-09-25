# ==============================================================================
# SurveyD (OmniPoll) - Production Dockerfile
# PHP 8.2 + Apache + PDO MySQL
# ==============================================================================

FROM php:8.2-apache

# Actualizar e instalar extensiones requeridas para MySQL y utilidades
RUN apt-get update && apt-get install -y \
    libzip-dev \
    zip \
    unzip \
    curl \
    && docker-php-ext-install pdo pdo_mysql opcache \
    && rm -rf /var/lib/apt/lists/*

# Habilitar módulos de Apache requeridos (mod_rewrite, mod_headers, mod_deflate, mod_expires)
RUN a2enmod rewrite headers deflate expires

# Configurar Apache document root
ENV APACHE_DOCUMENT_ROOT=/var/www/html
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Copiar código fuente al contenedor
COPY . /var/www/html/

# Configurar permisos adecuados para Apache
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Exponer puerto HTTP estándar
EXPOSE 80

# Comando de inicio
CMD ["apache2-foreground"]
