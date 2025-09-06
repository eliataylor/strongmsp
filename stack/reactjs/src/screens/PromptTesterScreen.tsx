import { Box, Container } from "@mui/material";
import React from "react";
import { PromptTester } from "../object-actions/prompt-tester";

const PromptTesterScreen: React.FC = () => {
    return (
        <Container maxWidth="xl">
            <Box sx={{ py: 3 }}>
                <PromptTester />
            </Box>
        </Container>
    );
};

export default PromptTesterScreen;
