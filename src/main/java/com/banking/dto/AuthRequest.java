package com.banking.dto;

public class AuthRequest {
    private String username;
    private String password;
    private String captchaToken;
    private Integer captchaAnswer;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getCaptchaToken() { return captchaToken; }
    public void setCaptchaToken(String captchaToken) { this.captchaToken = captchaToken; }
    public Integer getCaptchaAnswer() { return captchaAnswer; }
    public void setCaptchaAnswer(Integer captchaAnswer) { this.captchaAnswer = captchaAnswer; }
}
