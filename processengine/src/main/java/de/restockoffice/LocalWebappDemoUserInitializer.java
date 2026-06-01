package de.restockoffice;

import org.cibseven.bpm.engine.IdentityService;
import org.cibseven.bpm.engine.identity.Group;
import org.cibseven.bpm.engine.identity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("local-webapp")
public class LocalWebappDemoUserInitializer {

    private static final Logger log = LoggerFactory.getLogger(LocalWebappDemoUserInitializer.class);

    private static final String DEMO_USER_ID = "demo";
    private static final String DEMO_PASSWORD = "demo";
    private static final String ADMIN_GROUP_ID = "camunda-admin";

    @Bean
    ApplicationRunner createLocalDemoUser(IdentityService identityService) {
        return args -> {
            User user = identityService.createUserQuery()
                    .userId(DEMO_USER_ID)
                    .singleResult();

            if (user == null) {
                user = identityService.newUser(DEMO_USER_ID);
            }

            user.setFirstName("Local");
            user.setLastName("Admin");
            user.setEmail("demo@restockoffice.local");
            user.setPassword(DEMO_PASSWORD);
            identityService.saveUser(user);

            Group adminGroup = identityService.createGroupQuery()
                    .groupId(ADMIN_GROUP_ID)
                    .singleResult();

            if (adminGroup == null) {
                adminGroup = identityService.newGroup(ADMIN_GROUP_ID);
                adminGroup.setName("Camunda Admin");
                adminGroup.setType("SYSTEM");
                identityService.saveGroup(adminGroup);
            }

            boolean isMember = identityService.createGroupQuery()
                    .groupId(ADMIN_GROUP_ID)
                    .groupMember(DEMO_USER_ID)
                    .count() > 0;

            if (!isMember) {
                identityService.createMembership(DEMO_USER_ID, ADMIN_GROUP_ID);
            }

            boolean passwordWorks = identityService.checkPassword(DEMO_USER_ID, DEMO_PASSWORD);
            log.info("Local CIB seven demo user '{}' is ready; password verification: {}", DEMO_USER_ID, passwordWorks);
        };
    }
}
