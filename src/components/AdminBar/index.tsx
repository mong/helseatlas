"use client";

import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import { colors } from "@mui/material";
import React from "react";
import { usePathname, useRouter } from "next/navigation";

type AdminBarProps = {
  email: string;
  userName: string;
  preview: boolean;
};

const settings = [
  { tekst: "Gå til admin dashboard", url: "/admin" },
  { tekst: "Logg ut", url: "/.auth/logout" },
];

export default function AdminBar({ email, userName, preview }: AdminBarProps) {
  const [anchorElem, setAnchorElem] = React.useState<null | HTMLElement>(null);
  const router = useRouter();
  const pathName = usePathname();

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ margin: 0 }}>
        <Container maxWidth="xxl" disableGutters={false} sx={{ padding: 0 }}>
          <Toolbar disableGutters>
            <Box sx={{ flexGrow: 1, display: "flex" }}>
              <Avatar sx={{ bgcolor: colors.green["A200"], marginRight: 1 }}>
                <VerifiedUserIcon sx={{ color: "#000" }} />
              </Avatar>
              <Typography variant="h6" color="inherit" component="div">
                {userName} / {email}
              </Typography>
            </Box>
            {preview &&
              pathName.match(/\/(en|no)\/(rapporter|analyse)\/.+/) && (
                <Box sx={{ flexGrow: 0, marginX: 5 }}>
                  <Button
                    sx={{ textTransform: "none", color: "white" }}
                    variant="outlined"
                    color="secondary"
                    onClick={() =>
                      fetch("/next/exit-preview").then(() => router.refresh())
                    }
                  >
                    Forlat forhåndsvisning
                  </Button>
                </Box>
              )}
            <Box sx={{ flexGrow: 0 }}>
              <Tooltip title="Open settings">
                <IconButton
                  onClick={(e) => setAnchorElem(e.currentTarget)}
                  sx={{ p: 0, mr: 2 }}
                  edge="start"
                  color="inherit"
                  aria-label="menu"
                >
                  <MenuIcon />
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ mt: "45px" }}
                id="menu-appbar"
                anchorEl={anchorElem}
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                keepMounted
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                open={Boolean(anchorElem)}
                onClose={(e) => setAnchorElem(null)}
              >
                {settings.map((setting) => (
                  <MenuItem
                    onClick={(e) => setAnchorElem(null)}
                    component={Link}
                    href={setting.url}
                    key={setting.tekst}
                  >
                    <Typography sx={{ textAlign: "center" }}>
                      {setting.tekst}
                    </Typography>
                  </MenuItem>
                ))}
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
    </Box>
  );
}
