def clean_question(question_text):
    """
    Clean up question text by removing numbering and formatting.
    
    Args:
        question_text (str): Raw question text that may contain numbering
        
    Returns:
        str: Cleaned question text without numbering
    """
    if not question_text:
        return ""
    
    # Remove leading characters like ), ., etc.
    clean_question = question_text.lstrip(') .')
    
    # Remove numbering patterns
    if clean_question.startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.')):
        clean_question = clean_question[2:].strip()
    elif clean_question.startswith(('10.', '11.', '12.', '13.', '14.', '15.', '16.', '17.', '18.', '19.')):
        clean_question = clean_question[3:].strip()
    elif clean_question.startswith(('20.', '21.', '22.', '23.', '24.', '25.', '26.', '27.', '28.', '29.')):
        clean_question = clean_question[3:].strip()
    elif clean_question.startswith(('30.', '31.', '32.', '33.', '34.', '35.', '36.', '37.', '38.', '39.')):
        clean_question = clean_question[3:].strip()
    elif clean_question.startswith(('40.', '41.', '42.', '43.', '44.', '45.', '46.', '47.', '48.', '49.')):
        clean_question = clean_question[3:].strip()
    
    # Final cleanup
    return clean_question.strip()
