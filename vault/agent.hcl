vault {
  address = "http://vault:8200"
}

auto_auth {
  method "token_file" {
    config = {
      token_file_path = "/vault/credentials/agent-token"
    }
  }

  sink "file" {
    config = {
      path = "/tmp/vault-agent-token"
      mode = 0600
    }
  }
}

template {
  source      = "/vault/config/jwt-secret.ctmpl"
  destination = "/vault/secrets/jwt-secret"
  perms       = "0644"
}

template {
  source      = "/vault/config/redis-password.ctmpl"
  destination = "/vault/secrets/redis-password"
  perms       = "0644"
}
