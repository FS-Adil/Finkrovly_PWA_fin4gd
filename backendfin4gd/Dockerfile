FROM eclipse-temurin:21-jre

ARG JAR_FILE=target/*.jar

WORKDIR /opt/app

COPY ${JAR_FILE} app.jar

# --- Встроить корневой CA mkcert в cacerts образа ---
COPY mkcert-ca.crt /tmp/mkcert-ca.crt
RUN keytool -importcert -alias mkcert-ca \
      -file /tmp/mkcert-ca.crt \
      -keystore "$JAVA_HOME/lib/security/cacerts" \
      -storepass changeit -noprompt \
    && rm -f /tmp/mkcert-ca.crt
# ----------------------------------------------------

CMD ["java","-jar","app.jar", "--spring.profiles.active=prod"]