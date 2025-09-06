import { Box, Container } from "@mui/material";
import React from "react";
import { PurposeBasedTester } from "../object-actions/prompt-tester";

const PurposeBasedTesterScreen: React.FC = () => {
    return (
        <Container maxWidth="xl">
            <Box sx={{ py: 3 }}>
                <PurposeBasedTester />
            </Box>
        </Container>
    );
};

export default PurposeBasedTesterScreen;
