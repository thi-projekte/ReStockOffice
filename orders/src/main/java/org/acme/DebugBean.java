package org.acme;

import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import org.jboss.logging.Logger;

@ApplicationScoped
public class DebugBean {

    private static final Logger LOG = Logger.getLogger(DebugBean.class);

    @PostConstruct
    void init() {
        LOG.info("🔥 APP STARTED");
    }
}